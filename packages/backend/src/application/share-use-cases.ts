import type { ABTestRepository } from "../domain/ports/abtest-repository.js";
import type { ShareLinkRepository } from "../domain/ports/share-link-repository.js";
import { NotFoundError } from "./errors.js";

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toHex(new Uint8Array(digest));
}

export class ShareUseCases {
  constructor(
    private readonly testRepo: ABTestRepository,
    private readonly shareRepo: ShareLinkRepository,
  ) {}

  async create(userId: string, testId: string): Promise<{ token: string; prefix: string; createdAt: string }> {
    const test = await this.testRepo.findById(userId, testId);
    if (!test) throw new NotFoundError("ABTest");

    await this.shareRepo.removeByTest(userId, testId);

    const token = `shr_${toHex(crypto.getRandomValues(new Uint8Array(32)))}`;
    const prefix = token.slice(0, 12);
    const createdAt = new Date().toISOString();
    const hash = await sha256Hex(token);

    await this.shareRepo.save(hash, { testId, userId, prefix, createdAt });

    return { token, prefix, createdAt };
  }

  async status(userId: string, testId: string): Promise<{ shared: boolean; prefix?: string; createdAt?: string }> {
    const record = await this.shareRepo.findByTest(userId, testId);
    if (!record) return { shared: false };
    return { shared: true, prefix: record.prefix, createdAt: record.createdAt };
  }

  async revoke(userId: string, testId: string): Promise<void> {
    await this.shareRepo.removeByTest(userId, testId);
  }

  async resolve(rawToken: string): Promise<{ testId: string; userId: string } | undefined> {
    try {
      const hash = await sha256Hex(rawToken);
      const record = await this.shareRepo.findByHash(hash);
      if (!record) return undefined;
      return { testId: record.testId, userId: record.userId };
    } catch {
      return undefined;
    }
  }
}
