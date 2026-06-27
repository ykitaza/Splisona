import { vi, describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestTable, deleteTestTable } from "../helpers/dynamo.js";

const mockAIService = {
  generateDraft: vi.fn(),
  chat: vi.fn(),
  evaluateDesigns: vi.fn(),
  summarizeReasons: vi.fn(),
};

vi.mock("../../src/container.js", async (importOriginal) => {
  const orig = await importOriginal<typeof import("../../src/container.js")>();
  return {
    ...orig,
    createContainer: (config?: unknown) => orig.createContainer({
      ...(config as object),
      aiService: mockAIService,
    }),
  };
});

import { getReport, exportReport, listTestsForReport } from "../../src/report/handler.js";
import { createContainer } from "../../src/container.js";

const container = createContainer();
const { testRepo, evalRepo } = container;

function makeEvent(userId: string, testId?: string) {
  return {
    headers: { "x-local-user-id": userId },
    pathParameters: testId ? { id: testId } : {},
    body: null,
    requestContext: {},
  };
}

async function seedTest(userId: string, testId: string, overrides: Partial<{
  title: string; status: string; personaIds: string[];
}> = {}) {
  await testRepo.save({
    testId,
    userId,
    title: overrides.title ?? "レポートテスト",
    status: (overrides.status ?? "completed") as "completed",
    designAImageKey: "images/a.png",
    designBImageKey: "images/b.png",
    designAInputType: "image_upload",
    designBInputType: "image_upload",
    personaIds: overrides.personaIds ?? [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

async function seedEvaluation(testId: string, personaId: string, winner: "A" | "B", overrides: Partial<{
  scoresA: { usability: number; aesthetics: number; clarity: number; engagement: number; trust: number };
  scoresB: { usability: number; aesthetics: number; clarity: number; engagement: number; trust: number };
}> = {}) {
  await evalRepo.save({
    testId,
    personaId,
    winner,
    confidence: 80,
    reason: "理由",
    scoresA: overrides.scoresA ?? { usability: 8, aesthetics: 7, clarity: 9, engagement: 6, trust: 7 },
    scoresB: overrides.scoresB ?? { usability: 5, aesthetics: 6, clarity: 5, engagement: 7, trust: 5 },
    status: "completed",
    personaDisplayName: `ペルソナ${personaId}`,
    evaluatedAt: new Date().toISOString(),
  });
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

    it("avgScores が全 completed 評価の A案/B案 平均を返す（5軸）", async () => {
      const userId = "user-report-4";
      const testId = "test-report-4";
      await seedTest(userId, testId, { personaIds: ["p1", "p2"] });
      await seedEvaluation(testId, "p1", "A", {
        scoresA: { usability: 8, aesthetics: 6, clarity: 9, engagement: 7, trust: 8 },
        scoresB: { usability: 4, aesthetics: 5, clarity: 3, engagement: 6, trust: 4 },
      });
      await seedEvaluation(testId, "p2", "B", {
        scoresA: { usability: 6, aesthetics: 8, clarity: 7, engagement: 9, trust: 6 },
        scoresB: { usability: 2, aesthetics: 7, clarity: 5, engagement: 8, trust: 2 },
      });

      const res = await getReport(makeEvent(userId, testId));
      const body = JSON.parse(res.body);
      const avgA = body.summary.avgScores.A;
      const avgB = body.summary.avgScores.B;
      expect(avgA.usability).toBe(7);
      expect(avgB.usability).toBe(3);
      expect(avgA.trust).toBe(7);
      expect(avgB.trust).toBe(3);
    });

    it("trust が未定義の既存データでも avgScores.trust が 0 で返る", async () => {
      const userId = "user-report-5";
      const testId = "test-report-5";
      await seedTest(userId, testId, { personaIds: ["p1"] });
      // DynamoDBに直接 trust なしのデータを書き込む（旧データシミュレーション）
      await evalRepo.save({
        testId,
        personaId: "p1",
        winner: "A",
        confidence: 80,
        reason: "理由",
        scoresA: { usability: 8, aesthetics: 7, clarity: 9, engagement: 6, trust: 0 },
        scoresB: { usability: 5, aesthetics: 6, clarity: 5, engagement: 7, trust: 0 },
        status: "completed",
        personaDisplayName: "旧ペルソナ",
        evaluatedAt: new Date().toISOString(),
      });

      const res = await getReport(makeEvent(userId, testId));
      const body = JSON.parse(res.body);
      expect(res.statusCode).toBe(200);
      expect(body.summary.avgScores.A.trust).toBe(0);
      expect(body.summary.avgScores.B.trust).toBe(0);
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
      expect(lines[0]).toBe("personaId,displayName,winner,confidence,reason,A_usability,A_aesthetics,A_clarity,A_engagement,A_trust,B_usability,B_aesthetics,B_clarity,B_engagement,B_trust,status");
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
