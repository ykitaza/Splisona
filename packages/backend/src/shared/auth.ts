export interface ApiGatewayEvent {
  requestContext?: {
    authorizer?: {
      jwt?: {
        claims?: Record<string, string>;
      };
    };
  };
  headers?: Record<string, string>;
}

export function getUserId(event: ApiGatewayEvent): string {
  const sub = event.requestContext?.authorizer?.jwt?.claims?.["sub"];
  if (sub) return sub;

  // ローカル開発用: x-local-user-id ヘッダーからフォールバック
  const localUserId = event.headers?.["x-local-user-id"];
  if (localUserId) return localUserId;

  throw new Error("Unauthorized: no user identity found");
}
