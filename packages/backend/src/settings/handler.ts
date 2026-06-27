import { getUserId, type ApiGatewayEvent } from "../shared/auth.js";
import { createContainer, type AppContainer } from "../container.js";

let _container: AppContainer | undefined;
function container(): AppContainer {
  if (!_container) _container = createContainer();
  return _container;
}

function jsonResponse(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export async function getSettings(event: ApiGatewayEvent) {
  try {
    const userId = getUserId(event);
    const result = await container().settingsUseCases.getAll(userId);
    return jsonResponse(200, result);
  } catch (e) {
    return jsonResponse(500, { error: "INTERNAL_ERROR", message: String(e) });
  }
}

export async function putSettings(event: ApiGatewayEvent & { body?: string }) {
  const userId = getUserId(event);
  if (!event.body) return jsonResponse(400, { error: "body required" });

  const { section, data } = JSON.parse(event.body) as { section: string; data: unknown };

  try {
    await container().settingsUseCases.put(userId, section, data);
    return jsonResponse(200, { ok: true });
  } catch {
    return jsonResponse(400, { error: "invalid section" });
  }
}
