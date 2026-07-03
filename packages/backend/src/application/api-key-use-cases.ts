import type { ApiKeyRepository, ApiKeyRecord } from "../domain/ports/api-key-repository.js";

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toHex(new Uint8Array(digest));
}

export class ApiKeyUseCases {
  constructor(private readonly repo: ApiKeyRepository) {}

  async issue(userId: string, name: string): Promise<{
    keyId: string; name: string; prefix: string; createdAt: string; plainKey: string;
  }> {
    const plainKey = `sk_${toHex(crypto.getRandomValues(new Uint8Array(32)))}`;
    const keyId = `ak_${toHex(crypto.getRandomValues(new Uint8Array(8)))}`;
    const prefix = plainKey.slice(0, 12);
    const createdAt = new Date().toISOString();
    const hash = await sha256Hex(plainKey);

    await this.repo.save(hash, { keyId, userId, name, prefix, createdAt });

    return { keyId, name, prefix, createdAt, plainKey };
  }

  async list(userId: string): Promise<ApiKeyRecord[]> {
    return this.repo.listByUser(userId);
  }

  async revoke(userId: string, keyId: string): Promise<void> {
    await this.repo.remove(userId, keyId);
  }

  async verify(rawKey: string): Promise<{ userId: string } | undefined> {
    try {
      const hash = await sha256Hex(rawKey);
      const record = await this.repo.findByHash(hash);
      if (!record) return undefined;
      await this.repo.touchLastUsed(hash, new Date().toISOString());
      return { userId: record.userId };
    } catch {
      return undefined;
    }
  }
}
