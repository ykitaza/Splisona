import { vi, describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestTable, deleteTestTable } from "../helpers/dynamo.js";

const { mockSend } = vi.hoisted(() => ({ mockSend: vi.fn() }));
vi.mock("../../src/shared/bedrock.js", () => ({
  bedrockClient: { send: mockSend },
  MODEL_ID: "amazon.nova-lite-v1:0",
}));

import { executeTest, chunkArray } from "../../src/evaluation/orchestrator.js";
import { putItem, abtestKey, queryByPK, getItem } from "../../src/shared/dynamo.js";
import type { ABTestRecord, EvaluationRecord, PersonaRecord } from "../../src/shared/types.js";

function makeEvent(userId: string, testId: string) {
  return {
    headers: { "x-local-user-id": userId },
    pathParameters: { id: testId },
    body: null,
    requestContext: {},
  };
}

async function seedTest(userId: string, testId: string, overrides: Partial<ABTestRecord> = {}) {
  const record: ABTestRecord = {
    PK: `USER#${userId}`,
    SK: `ABTEST#${testId}`,
    title: "テスト",
    status: "draft",
    designAImageKey: "images/a.png",
    designBImageKey: "images/b.png",
    designAInputType: "image_upload",
    designBInputType: "image_upload",
    personaIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
  await putItem(record as unknown as Record<string, unknown>);
  return record;
}

async function seedPersona(userId: string, personaId: string) {
  const record: PersonaRecord = {
    PK: `USER#${userId}`,
    SK: `PERSONA#${personaId}`,
    displayName: `ペルソナ${personaId}`,
    type: "consumer",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await putItem(record as unknown as Record<string, unknown>);
  return record;
}

function makeBedrockResponse(winner: "A" | "B" = "A") {
  return {
    stopReason: "tool_use",
    output: {
      message: {
        content: [
          {
            toolUse: {
              name: "evaluate_designs",
              input: {
                winner,
                confidence: 80,
                reason: "デザインAが優れている",
                scores: { usability: 8, aesthetics: 7, clarity: 9, engagement: 6 },
              },
            },
          },
        ],
      },
    },
  };
}

describe("executeTest", () => {
  beforeAll(async () => {
    await createTestTable();
  });

  afterAll(async () => {
    await deleteTestTable();
  });

  describe("正常フロー", () => {
    it("3ペルソナで execute → Evaluation 3件保存 → status = completed", async () => {
      const userId = "user-exec-1";
      const testId = "test-exec-1";
      await seedPersona(userId, "p1");
      await seedPersona(userId, "p2");
      await seedPersona(userId, "p3");
      await seedTest(userId, testId, { personaIds: ["p1", "p2", "p3"] });

      mockSend.mockResolvedValue(makeBedrockResponse("A"));

      const res = await executeTest(makeEvent(userId, testId));
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toEqual({ started: true });

      const evaluations = await queryByPK<EvaluationRecord>(`ABTEST#${testId}`, "EVAL#");
      expect(evaluations).toHaveLength(3);
      expect(evaluations.every((e) => e.status === "completed")).toBe(true);

      const updatedTest = await getItem<ABTestRecord>(
        abtestKey(userId, testId) as unknown as Record<string, string>
      );
      expect(updatedTest?.status).toBe("completed");
    });
  });

  describe("409 already running", () => {
    it("すでに running 中のテストには 409 を返す", async () => {
      const userId = "user-exec-2";
      const testId = "test-exec-2";
      await seedTest(userId, testId, {
        status: "running",
        personaIds: ["p1"],
      });

      const res = await executeTest(makeEvent(userId, testId));
      expect(res.statusCode).toBe(409);
    });
  });

  describe("400 ペルソナ未設定", () => {
    it("personaIds が空の場合は 400 を返す", async () => {
      const userId = "user-exec-3";
      const testId = "test-exec-3";
      await seedTest(userId, testId, {
        personaIds: [],
        designAImageKey: "images/a.png",
        designBImageKey: "images/b.png",
      });

      const res = await executeTest(makeEvent(userId, testId));
      expect(res.statusCode).toBe(400);
    });

    it("designAImageKey が未設定の場合は 400 を返す", async () => {
      const userId = "user-exec-4";
      const testId = "test-exec-4";
      await seedTest(userId, testId, {
        personaIds: ["p1"],
        designAImageKey: undefined,
        designBImageKey: "images/b.png",
      });

      const res = await executeTest(makeEvent(userId, testId));
      expect(res.statusCode).toBe(400);
    });
  });

  describe("404 テスト未存在", () => {
    it("存在しないテストIDには 404 を返す", async () => {
      const res = await executeTest(makeEvent("user-exec-5", "nonexistent-test"));
      expect(res.statusCode).toBe(404);
    });
  });

  describe("個別ペルソナの Bedrock 失敗", () => {
    it("1件失敗しても全体は completed になり、失敗した評価は status=failed", async () => {
      const userId = "user-exec-6";
      const testId = "test-exec-6";
      await seedPersona(userId, "p-ok");
      await seedPersona(userId, "p-fail");
      await seedTest(userId, testId, { personaIds: ["p-ok", "p-fail"] });

      mockSend
        .mockResolvedValueOnce(makeBedrockResponse("B"))
        .mockRejectedValueOnce(new Error("Bedrock error"));

      const res = await executeTest(makeEvent(userId, testId));
      expect(res.statusCode).toBe(200);

      const evaluations = await queryByPK<EvaluationRecord>(`ABTEST#${testId}`, "EVAL#");
      expect(evaluations).toHaveLength(2);
      const failed = evaluations.find((e) => e.status === "failed");
      expect(failed).toBeDefined();
      const completed = evaluations.find((e) => e.status === "completed");
      expect(completed).toBeDefined();

      const updatedTest = await getItem<ABTestRecord>(
        abtestKey(userId, testId) as unknown as Record<string, string>
      );
      expect(updatedTest?.status).toBe("completed");
    });
  });

  describe("バッチ分割ロジック", () => {
    it("chunkArray が正しく分割する", () => {
      const arr = Array.from({ length: 60 }, (_, i) => i);
      const chunks = chunkArray(arr, 25);
      expect(chunks).toHaveLength(3);
      expect(chunks[0]).toHaveLength(25);
      expect(chunks[1]).toHaveLength(25);
      expect(chunks[2]).toHaveLength(10);
    });

    it("25件以下は1バッチ", () => {
      const arr = Array.from({ length: 10 }, (_, i) => i);
      const chunks = chunkArray(arr, 25);
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toHaveLength(10);
    });
  });
});
