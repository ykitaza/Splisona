export const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ?? 'http://localhost:3001';

let cachedJwt: string | null = null;
let jwtExpiry = 0;

async function getCfAccessJwt(): Promise<string | null> {
  if (cachedJwt && Date.now() < jwtExpiry) return cachedJwt;
  try {
    const res = await fetch('/cdn-cgi/access/get-identity', { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json() as { token?: string };
    if (!data.token) return null;
    cachedJwt = data.token;
    jwtExpiry = Date.now() + 300_000;
    return cachedJwt;
  } catch {
    return null;
  }
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function getApiErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.status) {
      case 401: return '認証が必要です。再度サインインしてください';
      case 404: return 'リソースが見つかりませんでした';
      case 409: return '操作が重複しています。少し待ってから再試行してください';
      case 503: return 'AIサービスが一時的に利用できません。しばらく後でお試しください';
      default: return err.message;
    }
  }
  if (err instanceof Error) return err.message;
  return '予期しないエラーが発生しました';
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const localUserId = import.meta.env?.VITE_LOCAL_USER_ID as string | undefined;
  if (localUserId) {
    return { 'x-local-user-id': localUserId };
  }
  if (import.meta.env?.VITE_COGNITO_USER_POOL_ID) {
    const { fetchAuthSession } = await import('aws-amplify/auth');
    const session = await fetchAuthSession();
    const token = session.tokens?.accessToken?.toString();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
  const cfJwt = await getCfAccessJwt();
  if (cfJwt) {
    return { 'Cf-Access-Jwt-Assertion': cfJwt };
  }
  return {};
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const authHeaders = await getAuthHeaders();

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...(options.headers as Record<string, string> ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string; message?: string };
    throw new ApiError(res.status, body.message ?? body.error ?? res.statusText);
  }

  return res.json() as Promise<T>;
}

export async function apiStream(path: string, options: RequestInit = {}): Promise<ReadableStream<Uint8Array> | null> {
  const authHeaders = await getAuthHeaders();

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...(options.headers as Record<string, string> ?? {}),
    },
  });

  if (!res.ok) {
    throw new ApiError(res.status, res.statusText);
  }

  return res.body;
}
