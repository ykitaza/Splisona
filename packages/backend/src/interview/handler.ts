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

export async function interviewPersona(
  event: ApiGatewayEvent & { pathParameters?: Record<string, string>; body?: string }
): Promise<LambdaResponse> {
  try {
    const userId = getUserId(event);
    const personaId = event.pathParameters?.id ?? "";
    const { messages = [] } = JSON.parse(event.body ?? "{}");
    const content = await container().interviewUseCases.chat(userId, personaId, messages);
    return json(200, { content });
  } catch (e) {
    if (e instanceof NotFoundError) return json(404, { error: "NOT_FOUND" });
    return errorResponse(503, "AI_UNAVAILABLE", "Bedrock call failed") as LambdaResponse;
  }
}
