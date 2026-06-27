import { getUserId, type ApiGatewayEvent } from "../shared/auth.js";
import { errorResponse } from "../shared/errors.js";
import { createContainer, type AppContainer } from "../container.js";
import { NotFoundError, ValidationError, ConflictError } from "../application/errors.js";

type LambdaResponse = { statusCode: number; headers: Record<string, string>; body: string };

function json(statusCode: number, body: unknown): LambdaResponse {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

let _container: AppContainer | undefined;
function container(): AppContainer {
  if (!_container) _container = createContainer();
  return _container;
}

export async function executeTest(
  event: ApiGatewayEvent & { pathParameters?: Record<string, string> }
): Promise<LambdaResponse> {
  try {
    const userId = getUserId(event);
    const testId = event.pathParameters?.id ?? "";
    await container().evaluationUseCases.executeTest(userId, testId);
    return json(200, { started: true });
  } catch (e) {
    if (e instanceof NotFoundError) return json(404, { error: "NOT_FOUND" });
    if (e instanceof ConflictError) return json(409, { error: "CONFLICT", message: e.message });
    if (e instanceof ValidationError) return json(400, { error: "VALIDATION_ERROR", message: e.message });
    return errorResponse(500, "INTERNAL_ERROR", String(e)) as LambdaResponse;
  }
}

