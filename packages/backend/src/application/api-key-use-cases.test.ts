import { describe, it, expect, beforeEach } from "vitest";
import { ApiKeyUseCases } from "./api-key-use-cases.js";
import type { ApiKeyRepository, ApiKeyRecord } from "../domain/ports/api-key-repository.js";

function createInMemoryRepo(): ApiKeyRepository {
  const store = new Map<string, ApiKeyRecord>();
  return {
    async findByHash(hash) { return store.get(hash); },
    async listByUser(userId) { return [...store.values()].filter((r) => r.userId === userId); },
    async save(hash, record) { store.set(hash, record); },
    async remove(userId, keyId) {
      for (const [hash, record] of store.entries()) {
        if (record.userId === userId && record.keyId === keyId) store.delete(hash);
      }
    },
    async touchLastUsed(hash, iso) {
      const record = store.get(hash);
      if (record) store.set(hash, { ...record, lastUsedAt: iso });
    },
  };
}

describe("ApiKeyUseCases", () => {
  let repo: ApiKeyRepository;
  let useCases: ApiKeyUseCases;

  beforeEach(() => {
    repo = createInMemoryRepo();
    useCases = new ApiKeyUseCases(repo);
  });

  it("issues a key and verifies it successfully", async () => {
    const issued = await useCases.issue("u1", "my key");
    expect(issued.plainKey).toMatch(/^sk_/);

    const result = await useCases.verify(issued.plainKey);
    expect(result).toEqual({ userId: "u1" });
  });

  it("fails verification for a tampered key", async () => {
    const issued = await useCases.issue("u1", "my key");
    const tampered = issued.plainKey.slice(0, -1) + (issued.plainKey.endsWith("a") ? "b" : "a");

    const result = await useCases.verify(tampered);
    expect(result).toBeUndefined();
  });

  it("fails verification after the key is revoked", async () => {
    const issued = await useCases.issue("u1", "my key");
    await useCases.revoke("u1", issued.keyId);

    const result = await useCases.verify(issued.plainKey);
    expect(result).toBeUndefined();
  });

  it("does not include plainKey in the list result", async () => {
    await useCases.issue("u1", "my key");
    const list = await useCases.list("u1");

    expect(list).toHaveLength(1);
    expect(list[0]).not.toHaveProperty("plainKey");
  });
});
