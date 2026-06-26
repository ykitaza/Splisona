import { getUserId, type ApiGatewayEvent } from "../shared/auth.js";
import { getItem, putItem, queryByPK, settingsKey } from "../shared/dynamo.js";

const VALID_SECTIONS = ["general", "figma", "model", "prompt"] as const;
type Section = (typeof VALID_SECTIONS)[number];

function isValidSection(s: string): s is Section {
  return (VALID_SECTIONS as readonly string[]).includes(s);
}

function jsonResponse(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export async function getSettings(event: ApiGatewayEvent) {
  const userId = getUserId(event);
  const items = await queryByPK<{ SK: string; data: unknown }>(
    `USER#${userId}`,
    "SETTINGS#"
  );

  const result: Record<string, unknown> = {};
  for (const item of items) {
    const section = item.SK.replace("SETTINGS#", "");
    result[section] = item.data;
  }
  return jsonResponse(200, result);
}

export async function putSettings(event: ApiGatewayEvent) {
  const userId = getUserId(event);
  if (!event.body) return jsonResponse(400, { error: "body required" });

  const { section, data } = JSON.parse(event.body) as {
    section: string;
    data: unknown;
  };

  if (!section || !isValidSection(section)) {
    return jsonResponse(400, { error: "invalid section" });
  }

  await putItem({
    ...settingsKey(userId, section),
    data,
    updatedAt: new Date().toISOString(),
  });

  return jsonResponse(200, { ok: true });
}
