import { describe, it, expect, beforeEach } from "vitest";
import { ShareUseCases } from "./share-use-cases.js";
import type { ABTestRepository } from "../domain/ports/abtest-repository.js";
import type { ShareLinkRepository, ShareLinkRecord } from "../domain/ports/share-link-repository.js";
import type { ABTest } from "../domain/types.js";

function createInMemoryTestRepo(seed: ABTest[]): ABTestRepository {
  const store = new Map<string, ABTest>(seed.map((t) => [t.testId, t]));
  return {
    async findAllByUser(userId) { return [...store.values()].filter((t) => t.userId === userId); },
    async findById(userId, testId) {
      const t = store.get(testId);
      return t?.userId === userId ? t : undefined;
    },
    async save(test) { store.set(test.testId, test); },
    async updateFields(userId, testId, fields) {
      const existing = store.get(testId);
      if (existing?.userId === userId) store.set(testId, { ...existing, ...fields });
    },
    async remove(userId, testId) {
      const t = store.get(testId);
      if (t?.userId === userId) store.delete(testId);
    },
  };
}

function createInMemoryShareRepo(): ShareLinkRepository {
  const store = new Map<string, ShareLinkRecord>();
  return {
    async findByHash(hash) { return store.get(hash); },
    async findByTest(userId, testId) {
      return [...store.values()].find((r) => r.userId === userId && r.testId === testId);
    },
    async save(hash, record) { store.set(hash, record); },
    async removeByTest(userId, testId) {
      for (const [hash, record] of store.entries()) {
        if (record.userId === userId && record.testId === testId) store.delete(hash);
      }
    },
  };
}

function buildTest(overrides: Partial<ABTest> = {}): ABTest {
  const now = new Date().toISOString();
  return {
    testId: "t1",
    userId: "u1",
    title: "test",
    status: "draft",
    designAInputType: "image_upload",
    designBInputType: "image_upload",
    personaIds: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("ShareUseCases", () => {
  let testRepo: ABTestRepository;
  let shareRepo: ShareLinkRepository;
  let useCases: ShareUseCases;

  beforeEach(() => {
    testRepo = createInMemoryTestRepo([buildTest()]);
    shareRepo = createInMemoryShareRepo();
    useCases = new ShareUseCases(testRepo, shareRepo);
  });

  it("creates a share link and resolves it successfully", async () => {
    const issued = await useCases.create("u1", "t1");
    expect(issued.token).toMatch(/^shr_/);
    expect(issued.prefix).toBe(issued.token.slice(0, 12));

    const resolved = await useCases.resolve(issued.token);
    expect(resolved).toEqual({ testId: "t1", userId: "u1" });
  });

  it("throws NotFoundError when creating a link for a missing or unowned test", async () => {
    await expect(useCases.create("u1", "missing")).rejects.toThrow();
    await expect(useCases.create("other-user", "t1")).rejects.toThrow();
  });

  it("returns undefined when resolving a tampered token", async () => {
    const issued = await useCases.create("u1", "t1");
    const tampered = issued.token.slice(0, -1) + (issued.token.endsWith("a") ? "b" : "a");

    const resolved = await useCases.resolve(tampered);
    expect(resolved).toBeUndefined();
  });

  it("invalidates the token after revoke", async () => {
    const issued = await useCases.create("u1", "t1");
    await useCases.revoke("u1", "t1");

    const resolved = await useCases.resolve(issued.token);
    expect(resolved).toBeUndefined();
  });

  it("invalidates the previous token when reissued", async () => {
    const first = await useCases.create("u1", "t1");
    const second = await useCases.create("u1", "t1");

    expect(await useCases.resolve(first.token)).toBeUndefined();
    expect(await useCases.resolve(second.token)).toEqual({ testId: "t1", userId: "u1" });
  });

  it("reflects status transitions across create/revoke", async () => {
    expect(await useCases.status("u1", "t1")).toEqual({ shared: false });

    const issued = await useCases.create("u1", "t1");
    expect(await useCases.status("u1", "t1")).toEqual({
      shared: true,
      prefix: issued.prefix,
      createdAt: issued.createdAt,
    });

    await useCases.revoke("u1", "t1");
    expect(await useCases.status("u1", "t1")).toEqual({ shared: false });
  });
});
