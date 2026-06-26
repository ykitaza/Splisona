import { getUserId, type ApiGatewayEvent } from "../shared/auth.js";
import { queryByPK, putItem, getItem, deleteItem, personaKey } from "../shared/dynamo.js";
import { badRequest, errorResponse } from "../shared/errors.js";
import { type PersonaRecord } from "../shared/types.js";
import { buildDefaultPersonaRecords } from "./defaults.js";
import { bedrockClient, MODEL_ID } from "../shared/bedrock.js";
import { ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, IMAGE_BUCKET } from "../shared/s3.js";
import crypto from "node:crypto";

type LambdaResponse = { statusCode: number; headers: Record<string, string>; body: string };

function json(statusCode: number, body: unknown): LambdaResponse {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

export async function listPersonas(event: ApiGatewayEvent): Promise<LambdaResponse> {
  try {
    const userId = getUserId(event);
    let items = await queryByPK<PersonaRecord>(`USER#${userId}`, "PERSONA#");

    // 初回ロード時にデフォルトペルソナ（20体）を自動シードする
    if (!items.some((p) => p.source === "default")) {
      const now = new Date().toISOString();
      const defaults = buildDefaultPersonaRecords(userId, now);
      await Promise.all(defaults.map((r) => putItem(r as unknown as Record<string, unknown>)));
      items = [...defaults, ...items];
    }

    const personas = items.map(toPersona);
    return json(200, personas);
  } catch (e) {
    return errorResponse(500, "INTERNAL_ERROR", String(e)) as LambdaResponse;
  }
}

export async function createPersona(event: ApiGatewayEvent & { body?: string }): Promise<LambdaResponse> {
  try {
    const userId = getUserId(event);
    const input = JSON.parse(event.body ?? "{}");
    if (!input.displayName?.trim()) return badRequest("displayName is required", ["displayName"]) as LambdaResponse;

    const personaId = crypto.randomUUID();
    const now = new Date().toISOString();
    const record: PersonaRecord = {
      ...personaKey(userId, personaId),
      displayName: input.displayName,
      type: input.type ?? "other",
      age: input.age,
      gender: input.gender,
      occupation: input.occupation,
      deviationScore: input.deviationScore,
      annualIncome: input.annualIncome,
      education: input.education,
      freeText: input.freeText,
      source: input.source,
      createdAt: now,
      updatedAt: now,
    };
    await putItem(record as unknown as Record<string, unknown>);
    return json(201, toPersona(record));
  } catch (e) {
    return errorResponse(500, "INTERNAL_ERROR", String(e)) as LambdaResponse;
  }
}

export async function getPersona(event: ApiGatewayEvent & { pathParameters?: Record<string, string> }): Promise<LambdaResponse> {
  try {
    const userId = getUserId(event);
    const personaId = event.pathParameters?.id ?? "";
    const item = await getItem<PersonaRecord>(personaKey(userId, personaId) as unknown as Record<string, string>);
    if (!item) return json(404, { error: "NOT_FOUND" });
    return json(200, toPersona(item));
  } catch (e) {
    return errorResponse(500, "INTERNAL_ERROR", String(e)) as LambdaResponse;
  }
}

export async function updatePersona(event: ApiGatewayEvent & { pathParameters?: Record<string, string>; body?: string }): Promise<LambdaResponse> {
  try {
    const userId = getUserId(event);
    const personaId = event.pathParameters?.id ?? "";
    const input = JSON.parse(event.body ?? "{}");

    if ("displayName" in input && !input.displayName?.trim()) {
      return badRequest("displayName is required", ["displayName"]) as LambdaResponse;
    }

    const existing = await getItem<PersonaRecord>(personaKey(userId, personaId) as unknown as Record<string, string>);
    if (!existing) return json(404, { error: "NOT_FOUND" });
    if (existing.source === "default") {
      return errorResponse(403, "FORBIDDEN", "デフォルトペルソナは編集できません") as LambdaResponse;
    }

    const now = new Date().toISOString();
    const updated: PersonaRecord = {
      ...existing,
      ...Object.fromEntries(
        Object.entries({
          displayName: input.displayName,
          type: input.type,
          age: input.age,
          gender: input.gender,
          occupation: input.occupation,
          deviationScore: input.deviationScore,
          annualIncome: input.annualIncome,
          education: input.education,
          freeText: input.freeText,
          source: input.source,
          avatarImageKey: input.avatarImageKey,
        }).filter(([, v]) => v !== undefined)
      ),
      updatedAt: now,
    } as PersonaRecord;

    await putItem(updated as unknown as Record<string, unknown>);
    return json(200, toPersona(updated));
  } catch (e) {
    return errorResponse(500, "INTERNAL_ERROR", String(e)) as LambdaResponse;
  }
}

export async function deletePersona(event: ApiGatewayEvent & { pathParameters?: Record<string, string> }): Promise<LambdaResponse> {
  try {
    const userId = getUserId(event);
    const personaId = event.pathParameters?.id ?? "";
    const existing = await getItem<PersonaRecord>(personaKey(userId, personaId) as unknown as Record<string, string>);
    if (!existing) return json(404, { error: "NOT_FOUND" });
    if (existing.source === "default") {
      return errorResponse(403, "FORBIDDEN", "デフォルトペルソナは削除できません") as LambdaResponse;
    }
    await deleteItem(personaKey(userId, personaId) as unknown as Record<string, string>);
    return json(200, { deleted: true });
  } catch (e) {
    return errorResponse(500, "INTERNAL_ERROR", String(e)) as LambdaResponse;
  }
}

export async function generateDraft(event: ApiGatewayEvent & { pathParameters?: Record<string, string> }): Promise<LambdaResponse> {
  try {
    const userId = getUserId(event);
    const personaId = event.pathParameters?.id ?? "";
    const persona = await getItem<PersonaRecord>(personaKey(userId, personaId) as unknown as Record<string, string>);
    if (!persona) return json(404, { error: "NOT_FOUND" });

    const attrs = [
      persona.type && `タイプ: ${persona.type}`,
      persona.age && `年齢: ${persona.age}歳`,
      persona.gender && `性別: ${persona.gender}`,
      persona.occupation && `職業: ${persona.occupation}`,
      persona.deviationScore && `偏差値: ${persona.deviationScore}`,
      persona.annualIncome && `年収: ${persona.annualIncome}万円`,
      persona.education && `学歴: ${persona.education}`,
    ]
      .filter(Boolean)
      .join("\n");

    const res = await bedrockClient.send(
      new ConverseCommand({
        modelId: MODEL_ID,
        system: [{ text: "あなたはペルソナ設計の専門家です。与えられた属性から人物像の自由記述と推奨説明を日本語で生成してください。" }],
        messages: [{ role: "user", content: [{ text: `ペルソナ名: ${persona.displayName}\n${attrs}\n\nこのペルソナの自由記述と推奨説明を generate_draft ツールで返してください。` }] }],
        toolConfig: {
          tools: [
            {
              toolSpec: {
                name: "generate_draft",
                description: "ペルソナの自由記述と推奨説明を生成する",
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                inputSchema: { json: { type: "object", properties: { freeText: { type: "string" }, suggestedDescription: { type: "string" } }, required: ["freeText", "suggestedDescription"] } as any },
              },
            },
          ],
          toolChoice: { tool: { name: "generate_draft" } },
        },
      })
    );

    const toolUse = (res as { output: { message: { content: { toolUse?: { input: { freeText: string; suggestedDescription: string } } }[] } } }).output.message.content.find(
      (c) => (c as { toolUse?: unknown }).toolUse
    ) as { toolUse: { input: { freeText: string; suggestedDescription: string } } } | undefined;

    if (!toolUse) return errorResponse(503, "AI_UNAVAILABLE", "No draft generated") as LambdaResponse;
    return json(200, toolUse.toolUse.input);
  } catch {
    return errorResponse(503, "AI_UNAVAILABLE", "Bedrock call failed") as LambdaResponse;
  }
}

export async function getPersonaUploadUrl(
  event: ApiGatewayEvent & { pathParameters?: Record<string, string>; body?: string }
): Promise<LambdaResponse> {
  try {
    const userId = getUserId(event);
    const personaId = event.pathParameters?.id ?? "";
    const { contentType = "image/png" } = JSON.parse(event.body ?? "{}");

    const existing = await getItem<PersonaRecord>(personaKey(userId, personaId) as unknown as Record<string, string>);
    if (!existing) return json(404, { error: "NOT_FOUND" });

    const ext = contentType === "image/jpeg" ? "jpg" : contentType === "image/webp" ? "webp" : "png";
    const imageKey = `${userId}/personas/${personaId}.${ext}`;

    const uploadUrl = await getSignedUrl(
      s3Client,
      new PutObjectCommand({ Bucket: IMAGE_BUCKET, Key: imageKey, ContentType: contentType }),
      { expiresIn: 900 }
    );

    return json(200, { uploadUrl, imageKey });
  } catch (e) {
    return errorResponse(500, "INTERNAL_ERROR", String(e)) as LambdaResponse;
  }
}

function toPersona(r: PersonaRecord) {
  const personaId = r.SK.replace("PERSONA#", "");
  const userId = r.PK.replace("USER#", "");
  return { personaId, userId, displayName: r.displayName, type: r.type, source: r.source, age: r.age, gender: r.gender, occupation: r.occupation, deviationScore: r.deviationScore, annualIncome: r.annualIncome, education: r.education, freeText: r.freeText, avatarImageKey: r.avatarImageKey, createdAt: r.createdAt, updatedAt: r.updatedAt };
}
