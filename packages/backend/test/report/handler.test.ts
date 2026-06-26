import { vi, describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestTable, deleteTestTable } from "../helpers/dynamo.js";

vi.mock("../../src/shared/s3.js", () => ({
  s3Client: {},
  IMAGE_BUCKET: "test-bucket",
}));

import { getReport, exportReport, listTestsForReport } from "../../src/report/handler.js";
import { putItem, abtestKey } from "../../src/shared/dynamo.js";
import type { ABTestRecord, EvaluationRecord } from "../../src/shared/types.js";

function makeEvent(userId: string, testId?: string) {
  return {
    headers: { "x-local-user-id": userId },
    pathParameters: testId ? { id: testId } : {},
    body: null,
    requestContext: {},
  };
}

async function seedTest(userId: string, testId: string, overrides: Partial<ABTestRecord> = {}) {
  const record: ABTestRecord = {
    PK: `USER#${userId}`,
    SK: `ABTEST#${testId}`,
    title: "レポートテスト",
    status: "completed",
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

async function seedEvaluation(testId: string, personaId: string, winner: "A" | "B", overrides: Partial<EvaluationRecord> = {}) {
  const record: EvaluationRecord = {
    PK: `ABTEST#${testId}`,
    SK: `EVAL#${personaId}`,
    winner,
    confidence: 80,
    reason: "理由",
    scores: { usability: 8, aesthetics: 7, clarity: 9, engagement: 6 },
    status: "completed",
    personaDisplayName: `ペルソナ${personaId}`,
    evaluatedAt: new Date().toISOString(),
    ...overrides,
  };
  await putItem(record as unknown as Record<string, unknown>);
  return record;
}

describe("Report handler", () => {
  beforeAll(async () => {
    await createTestTable();
  });

  afterAll(async () => {
    await deleteTestTable();
  });

  describe("getReport", () => {
    it("正しい支持率と勝者を返す", async () => {
      const userId = "user-report-1";
      const testId = "test-report-1";
      await seedTest(userId, testId, { personaIds: ["p1", "p2", "p3"] });
      await seedEvaluation(testId, "p1", "A");
      await seedEvaluation(testId, "p2", "A");
      await seedEvaluation(testId, "p3", "B");

      const res = await getReport(makeEvent(userId, testId));
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);

      expect(body.summary.winner).toBe("A");
      expect(body.summary.supportRateA).toBeCloseTo(2 / 3);
      expect(body.summary.supportRateB).toBeCloseTo(1 / 3);
      expect(body.summary.totalPersonas).toBe(3);
      expect(body.summary.completedPersonas).toBe(3);
      expect(body.evaluations).toHaveLength(3);
    });

    it("同数の場合は tie を返す", async () => {
      const userId = "user-report-2";
      const testId = "test-report-2";
      await seedTest(userId, testId, { personaIds: ["p1", "p2"] });
      await seedEvaluation(testId, "p1", "A");
      await seedEvaluation(testId, "p2", "B");

      const res = await getReport(makeEvent(userId, testId));
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.summary.winner).toBe("tie");
    });

    it("評価なしのテストは totalPersonas=0, winner=tie を返す", async () => {
      const userId = "user-report-3";
      const testId = "test-report-3";
      await seedTest(userId, testId, { personaIds: [] });

      const res = await getReport(makeEvent(userId, testId));
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.summary.totalPersonas).toBe(0);
      expect(body.summary.winner).toBe("tie");
    });

    it("存在しないテストIDには 404 を返す", async () => {
      const res = await getReport(makeEvent("user-report-x", "nonexistent-test-report"));
      expect(res.statusCode).toBe(404);
    });

    it("avgScores が completed な評価の平均を返す", async () => {
      const userId = "user-report-4";
      const testId = "test-report-4";
      await seedTest(userId, testId, { personaIds: ["p1", "p2"] });
      await seedEvaluation(testId, "p1", "A", {
        scores: { usability: 8, aesthetics: 6, clarity: 9, engagement: 7 },
      });
      await seedEvaluation(testId, "p2", "B", {
        scores: { usability: 6, aesthetics: 8, clarity: 7, engagement: 9 },
      });

      const res = await getReport(makeEvent(userId, testId));
      const body = JSON.parse(res.body);
      const avgA = body.summary.avgScores.A;
      const avgB = body.summary.avgScores.B;
      expect(avgA.usability).toBe(8);
      expect(avgB.usability).toBe(6);
    });
  });

  describe("exportReport", () => {
    it("CSV 形式で返す（Content-Type: text/csv）", async () => {
      const userId = "user-export-1";
      const testId = "test-export-1";
      await seedTest(userId, testId, { personaIds: ["p1", "p2"] });
      await seedEvaluation(testId, "p1", "A");
      await seedEvaluation(testId, "p2", "B");

      const res = await exportReport(makeEvent(userId, testId));
      expect(res.statusCode).toBe(200);
      expect(res.headers?.["Content-Type"]).toBe("text/csv");

      const lines = res.body.trim().split("\n");
      expect(lines[0]).toBe("personaId,displayName,winner,confidence,reason,usability,aesthetics,clarity,engagement,status");
      expect(lines).toHaveLength(3);
    });

    it("評価なしのテストは headers のみの CSV を返す", async () => {
      const userId = "user-export-2";
      const testId = "test-export-2";
      await seedTest(userId, testId, { personaIds: [] });

      const res = await exportReport(makeEvent(userId, testId));
      expect(res.statusCode).toBe(200);
      const lines = res.body.trim().split("\n");
      expect(lines).toHaveLength(1);
    });
  });

  describe("listTestsForReport", () => {
    it("ユーザーのテスト一覧を返す", async () => {
      const userId = "user-list-report";
      await seedTest(userId, "test-list-r1", { title: "一覧テスト1" });
      await seedTest(userId, "test-list-r2", { title: "一覧テスト2" });

      const res = await listTestsForReport(makeEvent(userId));
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(2);
    });
  });
});
