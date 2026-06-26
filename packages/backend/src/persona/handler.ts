import { getUserId, type ApiGatewayEvent } from "../shared/auth.js";
import { queryByPK, putItem, getItem, deleteItem, personaKey } from "../shared/dynamo.js";
import { badRequest, errorResponse } from "../shared/errors.js";
import { type PersonaRecord } from "../shared/types.js";
import crypto from "node:crypto";

type LambdaResponse = { statusCode: number; headers: Record<string, string>; body: string };

function json(statusCode: number, body: unknown): LambdaResponse {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

export async function listPersonas(event: ApiGatewayEvent): Promise<LambdaResponse> {
  try {
    const userId = getUserId(event);
    const items = await queryByPK<PersonaRecord>(`USER#${userId}`, "PERSONA#");
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
    await deleteItem(personaKey(userId, personaId) as unknown as Record<string, string>);
    return json(200, { deleted: true });
  } catch (e) {
    return errorResponse(500, "INTERNAL_ERROR", String(e)) as LambdaResponse;
  }
}

function toPersona(r: PersonaRecord) {
  const personaId = r.SK.replace("PERSONA#", "");
  const userId = r.PK.replace("USER#", "");
  return { personaId, userId, displayName: r.displayName, type: r.type, age: r.age, gender: r.gender, occupation: r.occupation, deviationScore: r.deviationScore, annualIncome: r.annualIncome, education: r.education, freeText: r.freeText, createdAt: r.createdAt, updatedAt: r.updatedAt };
}
