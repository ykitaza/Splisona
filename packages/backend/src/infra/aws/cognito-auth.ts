import { CognitoJwtVerifier } from "aws-jwt-verify";

export type CognitoVerifier = ReturnType<typeof CognitoJwtVerifier.create>;

export function createCognitoVerifier(userPoolId: string, clientId: string): CognitoVerifier {
  return CognitoJwtVerifier.create({
    userPoolId,
    tokenUse: "access",
    clientId,
  });
}

export async function verifyCognitoToken(verifier: CognitoVerifier, token: string): Promise<string> {
  const payload = await verifier.verify(token);
  const email = (payload as Record<string, unknown>).email;
  if (typeof email === "string" && email) return email;
  const username = (payload as Record<string, unknown>).username;
  if (typeof username === "string" && username) return username;
  return payload.sub;
}
