import { getUserId, type ApiGatewayEvent } from "../shared/auth.js";
import { badRequest, errorResponse } from "../shared/errors.js";
import { createContainer, type AppContainer } from "../container.js";
import { NotFoundError, ForbiddenError } from "../application/errors.js";

type LambdaResponse = { statusCode: number; headers: Record<string, string>; body: string };

function json(statusCode: number, body: unknown): LambdaResponse {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

function handleError(e: unknown): LambdaResponse {
  if (e instanceof NotFoundError) return json(404, { error: "NOT_FOUND" });
  if (e instanceof ForbiddenError) return errorResponse(403, "FORBIDDEN", e.message) as LambdaResponse;
  return errorResponse(500, "INTERNAL_ERROR", String(e)) as LambdaResponse;
}

let _container: AppContainer | undefined;
function container(): AppContainer {
  if (!_container) _container = createContainer();
  return _container;
}

export async function listPersonas(event: ApiGatewayEvent): Promise<LambdaResponse> {
  try {
    const userId = getUserId(event);
    const personas = await container().personaUseCases.list(userId);
    return json(200, personas);
  } catch (e) {
    return handleError(e);
  }
}

export async function createPersona(event: ApiGatewayEvent & { body?: string }): Promise<LambdaResponse> {
  try {
    const userId = getUserId(event);
    const input = JSON.parse(event.body ?? "{}");
    if (!input.displayName?.trim()) return badRequest("displayName is required", ["displayName"]) as LambdaResponse;
    const persona = await container().personaUseCases.create(userId, input);
    return json(201, persona);
  } catch (e) {
    return handleError(e);
  }
}

export async function getPersona(event: ApiGatewayEvent & { pathParameters?: Record<string, string> }): Promise<LambdaResponse> {
  try {
    const userId = getUserId(event);
    const personaId = event.pathParameters?.id ?? "";
    const persona = await container().personaUseCases.get(userId, personaId);
    if (!persona) return json(404, { error: "NOT_FOUND" });
    return json(200, persona);
  } catch (e) {
    return handleError(e);
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
    const persona = await container().personaUseCases.update(userId, personaId, input);
    return json(200, persona);
  } catch (e) {
    return handleError(e);
  }
}

export async function deletePersona(event: ApiGatewayEvent & { pathParameters?: Record<string, string> }): Promise<LambdaResponse> {
  try {
    const userId = getUserId(event);
    const personaId = event.pathParameters?.id ?? "";
    await container().personaUseCases.delete(userId, personaId);
    return json(200, { deleted: true });
  } catch (e) {
    return handleError(e);
  }
}

export async function generateDraft(event: ApiGatewayEvent & { pathParameters?: Record<string, string> }): Promise<LambdaResponse> {
  try {
    const userId = getUserId(event);
    const personaId = event.pathParameters?.id ?? "";
    const draft = await container().personaUseCases.generateDraft(userId, personaId);
    return json(200, draft);
  } catch (e) {
    if (e instanceof NotFoundError) return json(404, { error: "NOT_FOUND" });
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
    const result = await container().personaUseCases.getUploadUrl(userId, personaId, contentType);
    return json(200, result);
  } catch (e) {
    return handleError(e);
  }
}
