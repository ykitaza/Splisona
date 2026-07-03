import { resolveConfig } from "./config.js";

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: string,
  ) {
    super(`API request failed (${status}): ${body}`);
  }
}

export class ConfigError extends Error {}

function getAuth(): { apiUrl: string; apiKey: string } {
  const { apiUrl, apiKey } = resolveConfig();
  if (!apiKey) {
    throw new ConfigError(
      "APIキーが設定されていません。`splisona auth login` を実行してください。",
    );
  }
  return { apiUrl: apiUrl!, apiKey };
}

async function request<T>(
  method: string,
  pathname: string,
  body?: unknown,
): Promise<T> {
  const { apiUrl, apiKey } = getAuth();
  const res = await fetch(`${apiUrl}${pathname}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, text);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

export const api = {
  get: <T>(pathname: string) => request<T>("GET", pathname),
  post: <T>(pathname: string, body?: unknown) =>
    request<T>("POST", pathname, body ?? {}),
  put: <T>(pathname: string, body?: unknown) =>
    request<T>("PUT", pathname, body ?? {}),
  delete: <T = unknown>(pathname: string) => request<T>("DELETE", pathname),
};

/** Uploads image bytes to the presigned upload URL, routing through the API origin unless it targets localhost. */
export async function uploadImage(
  uploadUrl: string,
  imageKey: string,
  contentType: string,
  data: Buffer,
): Promise<void> {
  const { apiUrl } = getAuth();
  const isLocal =
    apiUrl.includes("localhost") || apiUrl.includes("127.0.0.1");
  const targetUrl = isLocal ? uploadUrl : `${apiUrl}/upload/${imageKey}`;
  const res = await fetch(targetUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: data as unknown as BodyInit,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, text);
  }
}
