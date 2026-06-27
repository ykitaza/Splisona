import { getUserId, type ApiGatewayEvent } from "../shared/auth.js";
import { badRequest, errorResponse } from "../shared/errors.js";
import { createContainer, type AppContainer } from "../container.js";
import { NotFoundError } from "../application/errors.js";
import { toABTestDTO } from "../domain/types.js";

type LambdaResponse = { statusCode: number; headers: Record<string, string>; body: string };

function json(statusCode: number, body: unknown): LambdaResponse {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

function handleError(e: unknown): LambdaResponse {
  if (e instanceof NotFoundError) return json(404, { error: "NOT_FOUND" });
  return errorResponse(500, "INTERNAL_ERROR", String(e)) as LambdaResponse;
}

let _container: AppContainer | undefined;
function container(): AppContainer {
  if (!_container) _container = createContainer();
  return _container;
}

export async function createTest(
  event: ApiGatewayEvent & { body?: string }
): Promise<LambdaResponse> {
  try {
    const userId = getUserId(event);
    const input = JSON.parse(event.body ?? "{}");
    if (!input.title) input.title = "";
    const test = await container().abtestUseCases.create(userId, input);
    return json(201, toABTestDTO(test));
  } catch (e) {
    return handleError(e);
  }
}

export async function listTests(event: ApiGatewayEvent): Promise<LambdaResponse> {
  try {
    const userId = getUserId(event);
    const tests = await container().abtestUseCases.list(userId);
    return json(200, tests.map(toABTestDTO));
  } catch (e) {
    return handleError(e);
  }
}

export async function getTest(
  event: ApiGatewayEvent & { pathParameters?: Record<string, string> }
): Promise<LambdaResponse> {
  try {
    const userId = getUserId(event);
    const testId = event.pathParameters?.id ?? "";
    const test = await container().abtestUseCases.get(userId, testId);
    if (!test) return json(404, { error: "NOT_FOUND" });
    return json(200, toABTestDTO(test));
  } catch (e) {
    return handleError(e);
  }
}

export async function updateTest(
  event: ApiGatewayEvent & { pathParameters?: Record<string, string>; body?: string }
): Promise<LambdaResponse> {
  try {
    const userId = getUserId(event);
    const testId = event.pathParameters?.id ?? "";
    const input = JSON.parse(event.body ?? "{}");
    const test = await container().abtestUseCases.update(userId, testId, input);
    return json(200, toABTestDTO(test));
  } catch (e) {
    return handleError(e);
  }
}

export async function deleteTest(
  event: ApiGatewayEvent & { pathParameters?: Record<string, string> }
): Promise<LambdaResponse> {
  try {
    const userId = getUserId(event);
    const testId = event.pathParameters?.id ?? "";
    await container().abtestUseCases.delete(userId, testId);
    return json(200, { deleted: true });
  } catch (e) {
    return handleError(e);
  }
}

export async function getUploadUrl(
  event: ApiGatewayEvent & { pathParameters?: Record<string, string>; body?: string }
): Promise<LambdaResponse> {
  try {
    const userId = getUserId(event);
    const testId = event.pathParameters?.id ?? "";
    const { side, contentType = "image/png" } = JSON.parse(event.body ?? "{}");
    const result = await container().abtestUseCases.getUploadUrl(userId, testId, side, contentType);
    return json(200, result);
  } catch (e) {
    return handleError(e);
  }
}

export async function getProgress(
  event: ApiGatewayEvent & { pathParameters?: Record<string, string> }
): Promise<LambdaResponse> {
  try {
    const userId = getUserId(event);
    const testId = event.pathParameters?.id ?? "";
    const progress = await container().abtestUseCases.getProgress(userId, testId);
    return json(200, progress);
  } catch (e) {
    return handleError(e);
  }
}
