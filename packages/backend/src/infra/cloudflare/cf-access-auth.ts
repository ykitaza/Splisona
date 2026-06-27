interface JWK {
  kid: string;
  kty: string;
  alg: string;
  n: string;
  e: string;
}

interface CertsResponse {
  keys: JWK[];
}

interface JWTHeader {
  kid: string;
  alg: string;
}

interface JWTPayload {
  email: string;
  aud: string[];
  iss: string;
  exp: number;
  iat: number;
  sub: string;
}

let cachedKeys: JWK[] | null = null;
let cacheExpiry = 0;

export async function verifyAccessJWT(
  token: string,
  teamDomain: string,
  policyAud: string,
): Promise<string> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT format");

  const header = JSON.parse(atob(parts[0])) as JWTHeader;
  const payload = JSON.parse(atob(parts[1])) as JWTPayload;

  if (payload.exp < Date.now() / 1000) throw new Error("Token expired");
  if (!payload.aud.includes(policyAud)) throw new Error("Invalid audience");
  if (payload.iss !== teamDomain) throw new Error("Invalid issuer");

  const keys = await getPublicKeys(teamDomain);
  const key = keys.find((k) => k.kid === header.kid);
  if (!key) throw new Error("No matching key found");

  const isValid = await verifySignature(parts[0] + "." + parts[1], parts[2], key);
  if (!isValid) throw new Error("Invalid signature");

  return payload.email;
}

async function getPublicKeys(teamDomain: string): Promise<JWK[]> {
  if (cachedKeys && Date.now() < cacheExpiry) return cachedKeys;

  const res = await fetch(`${teamDomain}/cdn-cgi/access/certs`);
  if (!res.ok) throw new Error("Failed to fetch Access certs");

  const data = await res.json() as CertsResponse;
  cachedKeys = data.keys;
  cacheExpiry = Date.now() + 3600_000;
  return data.keys;
}

async function verifySignature(data: string, signature: string, jwk: JWK): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "jwk",
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256" },
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );

  const sig = base64UrlDecode(signature);
  const buf = new TextEncoder().encode(data);

  return crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, sig, buf);
}

function base64UrlDecode(str: string): ArrayBuffer {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - base64.length % 4) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer as ArrayBuffer;
}
