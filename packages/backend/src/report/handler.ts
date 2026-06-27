import { getUserId, type ApiGatewayEvent } from "../shared/auth.js";
import { errorResponse } from "../shared/errors.js";
import { createContainer, type AppContainer } from "../container.js";
import { NotFoundError } from "../application/errors.js";

type LambdaResponse = { statusCode: number; headers: Record<string, string>; body: string };

function json(statusCode: number, body: unknown): LambdaResponse {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

let _container: AppContainer | undefined;
function container(): AppContainer {
  if (!_container) _container = createContainer();
  return _container;
}

export async function listTestsForReport(event: ApiGatewayEvent): Promise<LambdaResponse> {
  try {
    const userId = getUserId(event);
    const tests = await container().reportUseCases.listTests(userId);
    return json(200, tests);
  } catch (e) {
    return errorResponse(500, "INTERNAL_ERROR", String(e)) as LambdaResponse;
  }
}

export async function getReport(
  event: ApiGatewayEvent & { pathParameters?: Record<string, string> }
): Promise<LambdaResponse> {
  try {
    const userId = getUserId(event);
    const testId = event.pathParameters?.id ?? "";
    const report = await container().reportUseCases.getReport(userId, testId);
    return json(200, report);
  } catch (e) {
    if (e instanceof NotFoundError) return json(404, { error: "NOT_FOUND" });
    return errorResponse(500, "INTERNAL_ERROR", String(e)) as LambdaResponse;
  }
}

export async function exportReport(
  event: ApiGatewayEvent & { pathParameters?: Record<string, string> }
): Promise<LambdaResponse> {
  try {
    const userId = getUserId(event);
    const testId = event.pathParameters?.id ?? "";
    const csv = await container().reportUseCases.exportReport(userId, testId);
    return { statusCode: 200, headers: { "Content-Type": "text/csv" }, body: csv };
  } catch (e) {
    if (e instanceof NotFoundError) return json(404, { error: "NOT_FOUND" });
    return errorResponse(500, "INTERNAL_ERROR", String(e)) as LambdaResponse;
  }
}
