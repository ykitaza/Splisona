import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { DynamoDBClient, CreateTableCommand, ListTablesCommand, DeleteTableCommand } from "@aws-sdk/client-dynamodb";
import { createDynamoClient, DynamoOperations } from "./dynamo-client.js";
import { DynamoABTestRepository } from "./dynamo-abtest-repository.js";
import { DynamoEvaluationRepository } from "./dynamo-evaluation-repository.js";
import { DynamoApiKeyRepository } from "./dynamo-api-key-repository.js";
import { DynamoShareLinkRepository } from "./dynamo-share-link-repository.js";
import { DynamoProjectRepository } from "./dynamo-project-repository.js";
import type { ABTest, Evaluation, Project } from "../../domain/types.js";

const ENDPOINT = process.env.DYNAMODB_ENDPOINT ?? "http://localhost:8000";
const TABLE_NAME = process.env.TABLE_NAME ?? "chorus-main-test";

async function isDynamoLocalAvailable(): Promise<boolean> {
  const client = new DynamoDBClient({
    endpoint: ENDPOINT,
    region: "us-east-1",
    credentials: { accessKeyId: "local", secretAccessKey: "local" },
  });
  try {
    await client.send(new ListTablesCommand({}));
    return true;
  } catch {
    return false;
  } finally {
    client.destroy();
  }
}

const available = await isDynamoLocalAvailable();

describe.skipIf(!available)("Dynamo repositories (integration, dynamodb-local)", () => {
  let db: DynamoOperations;

  beforeAll(async () => {
    const rawClient = new DynamoDBClient({
      endpoint: ENDPOINT,
      region: "us-east-1",
      credentials: { accessKeyId: "local", secretAccessKey: "local" },
    });
    const { TableNames } = await rawClient.send(new ListTablesCommand({}));
    if (!TableNames?.includes(TABLE_NAME)) {
      await rawClient.send(
        new CreateTableCommand({
          TableName: TABLE_NAME,
          BillingMode: "PAY_PER_REQUEST",
          AttributeDefinitions: [
            { AttributeName: "PK", AttributeType: "S" },
            { AttributeName: "SK", AttributeType: "S" },
          ],
          KeySchema: [
            { AttributeName: "PK", KeyType: "HASH" },
            { AttributeName: "SK", KeyType: "RANGE" },
          ],
        })
      );
    }
    rawClient.destroy();

    const docClient = createDynamoClient();
    db = new DynamoOperations(docClient, TABLE_NAME);
  });

  afterAll(async () => {
    const rawClient = new DynamoDBClient({
      endpoint: ENDPOINT,
      region: "us-east-1",
      credentials: { accessKeyId: "local", secretAccessKey: "local" },
    });
    await rawClient.send(new DeleteTableCommand({ TableName: TABLE_NAME })).catch(() => {});
    rawClient.destroy();
  });

  describe("DynamoABTestRepository", () => {
    it("round-trips segmentKeys, improvementReport and executedBy via save/findById", async () => {
      const repo = new DynamoABTestRepository(db);
      const test: ABTest = {
        testId: "t1",
        userId: "u1",
        title: "Test 1",
        status: "completed",
        designAImageKey: "a.png",
        designBImageKey: "b.png",
        designASegmentKeys: ["a-seg-1", "a-seg-2"],
        designBSegmentKeys: ["b-seg-1"],
        designAInputType: "image_upload",
        designBInputType: "image_upload",
        personaIds: ["p1", "p2"],
        improvementReport: {
          designSummaryA: "summary A",
          designSummaryB: "summary B",
          suggestions: [
            { target: "A", kind: "weakness", title: "t", evidence: "e", implementationPrompt: "ip" },
          ],
        },
        executedBy: "local:claude-sonnet-4-5",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      };

      await repo.save(test);
      const found = await repo.findById("u1", "t1");

      expect(found?.designASegmentKeys).toEqual(["a-seg-1", "a-seg-2"]);
      expect(found?.designBSegmentKeys).toEqual(["b-seg-1"]);
      expect(found?.improvementReport).toEqual(test.improvementReport);
      expect(found?.executedBy).toBe("local:claude-sonnet-4-5");
    });

    it("updates improvementReport and executedBy via updateFields", async () => {
      const repo = new DynamoABTestRepository(db);
      const test: ABTest = {
        testId: "t2",
        userId: "u1",
        title: "Test 2",
        status: "draft",
        designAInputType: "image_upload",
        designBInputType: "image_upload",
        personaIds: [],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      };
      await repo.save(test);

      await repo.updateFields("u1", "t2", {
        improvementReport: { suggestions: [] },
        executedBy: "local:test",
        updatedAt: "2026-01-02T00:00:00.000Z",
      });

      const found = await repo.findById("u1", "t2");
      expect(found?.improvementReport).toEqual({ suggestions: [] });
      expect(found?.executedBy).toBe("local:test");
      expect(found?.updatedAt).toBe("2026-01-02T00:00:00.000Z");
    });
  });

  describe("DynamoEvaluationRepository", () => {
    it("round-trips resolvedPrompt and modelId via save/findAllByTest", async () => {
      const repo = new DynamoEvaluationRepository(db);
      const evaluation: Evaluation = {
        testId: "t3",
        personaId: "p1",
        winner: "A",
        confidence: 0.8,
        reason: "reason",
        scoresA: { usability: 4, aesthetics: 4, clarity: 4, engagement: 4, trust: 4 },
        scoresB: { usability: 3, aesthetics: 3, clarity: 3, engagement: 3, trust: 3 },
        status: "completed",
        personaDisplayName: "Persona 1",
        evaluatedAt: "2026-01-01T00:00:00.000Z",
        resolvedPrompt: "resolved prompt text",
        modelId: "us.anthropic.claude-haiku-4-5-20251001-v1:0",
      };

      await repo.save(evaluation);
      const found = await repo.findAllByTest("t3");

      expect(found).toHaveLength(1);
      expect(found[0].resolvedPrompt).toBe("resolved prompt text");
      expect(found[0].modelId).toBe("us.anthropic.claude-haiku-4-5-20251001-v1:0");
    });
  });

  describe("DynamoApiKeyRepository", () => {
    it("supports save, findByHash, listByUser, touchLastUsed, remove", async () => {
      const repo = new DynamoApiKeyRepository(db);
      const hash = "hash-1";
      await repo.save(hash, {
        keyId: "k1",
        userId: "u2",
        name: "my key",
        prefix: "sk_abcd",
        createdAt: "2026-01-01T00:00:00.000Z",
      });

      const byHash = await repo.findByHash(hash);
      expect(byHash?.keyId).toBe("k1");
      expect(byHash?.userId).toBe("u2");

      const list = await repo.listByUser("u2");
      expect(list).toHaveLength(1);
      expect(list[0].keyId).toBe("k1");

      await repo.touchLastUsed(hash, "2026-01-02T00:00:00.000Z");
      const touched = await repo.findByHash(hash);
      expect(touched?.lastUsedAt).toBe("2026-01-02T00:00:00.000Z");
      const listAfterTouch = await repo.listByUser("u2");
      expect(listAfterTouch[0].lastUsedAt).toBe("2026-01-02T00:00:00.000Z");

      await repo.remove("u2", "k1");
      expect(await repo.findByHash(hash)).toBeUndefined();
      expect(await repo.listByUser("u2")).toHaveLength(0);
    });
  });

  describe("DynamoShareLinkRepository", () => {
    it("supports save, findByHash, findByTest, removeByTest", async () => {
      const repo = new DynamoShareLinkRepository(db);
      const hash = "share-hash-1";
      await repo.save(hash, {
        testId: "t4",
        userId: "u3",
        prefix: "shr_abcd",
        createdAt: "2026-01-01T00:00:00.000Z",
      });

      const byHash = await repo.findByHash(hash);
      expect(byHash?.testId).toBe("t4");
      expect(byHash?.userId).toBe("u3");

      const byTest = await repo.findByTest("u3", "t4");
      expect(byTest?.prefix).toBe("shr_abcd");

      await repo.removeByTest("u3", "t4");
      expect(await repo.findByHash(hash)).toBeUndefined();
      expect(await repo.findByTest("u3", "t4")).toBeUndefined();
    });
  });

  describe("DynamoProjectRepository", () => {
    it("supports save, findAllByUser, update, remove", async () => {
      const repo = new DynamoProjectRepository(db);
      const project: Project = {
        projectId: "proj1",
        userId: "u4",
        name: "Project 1",
        description: "desc",
        testIds: ["t1", "t2"],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      };

      await repo.save(project);
      const all = await repo.findAllByUser("u4");
      expect(all).toHaveLength(1);
      expect(all[0]).toEqual(project);

      const updated: Project = { ...project, name: "Project 1 updated", testIds: ["t1", "t2", "t3"] };
      await repo.save(updated);
      const found = await repo.findById("u4", "proj1");
      expect(found?.name).toBe("Project 1 updated");
      expect(found?.testIds).toEqual(["t1", "t2", "t3"]);

      await repo.remove("u4", "proj1");
      expect(await repo.findById("u4", "proj1")).toBeUndefined();
    });
  });
});
