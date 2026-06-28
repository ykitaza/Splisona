import { describe, it, expect, vi, beforeEach } from "vitest";
import { EvaluationUseCases } from "./evaluation-use-cases.js";
import type { ABTestRepository } from "../domain/ports/abtest-repository.js";
import type { EvaluationRepository } from "../domain/ports/evaluation-repository.js";
import type { PersonaRepository } from "../domain/ports/persona-repository.js";
import type { SettingsRepository } from "../domain/ports/settings-repository.js";
import type { AIService } from "../domain/ports/ai-service.js";
import type { ABTest, Evaluation, EvaluationScores } from "../domain/types.js";

function scores(v = 5): EvaluationScores {
  return { usability: v, aesthetics: v, clarity: v, engagement: v, trust: v };
}

function makeTest(overrides: Partial<ABTest> = {}): ABTest {
  return {
    testId: "t1",
    userId: "u1",
    title: "Test",
    status: "draft",
    designAImageKey: "a.png",
    designBImageKey: "b.png",
    designAInputType: "image_upload",
    designBInputType: "image_upload",
    personaIds: ["p1", "p2", "p3"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeEval(personaId: string, winner: "A" | "B" | "none", status: "completed" | "failed" = "completed"): Evaluation {
  return {
    testId: "t1",
    personaId,
    winner,
    confidence: 80,
    reason: `${winner} is better`,
    scoresA: scores(winner === "A" ? 8 : 5),
    scoresB: scores(winner === "B" ? 8 : 5),
    status,
    personaDisplayName: `Persona ${personaId}`,
    evaluatedAt: new Date().toISOString(),
  };
}

describe("EvaluationUseCases", () => {
  let testRepo: ABTestRepository;
  let evalRepo: EvaluationRepository;
  let personaRepo: PersonaRepository;
  let settingsRepo: SettingsRepository;
  let aiService: AIService;
  let useCases: EvaluationUseCases;
  let savedTests: ABTest[];
  let savedEvals: Evaluation[];

  beforeEach(() => {
    savedTests = [];
    savedEvals = [];

    const test = makeTest();

    testRepo = {
      findAllByUser: vi.fn().mockResolvedValue([test]),
      findById: vi.fn().mockResolvedValue(test),
      save: vi.fn().mockImplementation(async (t: ABTest) => { savedTests.push(t); }),
      updateFields: vi.fn(),
      remove: vi.fn(),
    };

    evalRepo = {
      findAllByTest: vi.fn().mockResolvedValue([]),
      save: vi.fn().mockImplementation(async (e: Evaluation) => { savedEvals.push(e); }),
      removeAllByTest: vi.fn(),
    };

    personaRepo = {
      findAllByUser: vi.fn().mockResolvedValue([]),
      findById: vi.fn().mockResolvedValue({ personaId: "p1", userId: "u1", displayName: "Test Persona", type: "action_oriented", createdAt: "", updatedAt: "" }),
      save: vi.fn(),
      saveAll: vi.fn(),
      remove: vi.fn(),
    };

    settingsRepo = {
      findAllByUser: vi.fn().mockResolvedValue([]),
      findBySection: vi.fn().mockResolvedValue(undefined),
      save: vi.fn(),
    };

    aiService = {
      generateDraft: vi.fn(),
      chat: vi.fn(),
      evaluateDesigns: vi.fn().mockResolvedValue({
        winner: "A",
        confidence: 85,
        reason: "A is better",
        scoresA: scores(8),
        scoresB: scores(5),
      }),
      summarizeReasons: vi.fn().mockResolvedValue({ reasonsA: ["Good design"], reasonsB: ["Decent"] }),
      generateTitle: vi.fn().mockResolvedValue("Generated Title"),
    };

    const projectRepo = {
      findAllByUser: vi.fn().mockResolvedValue([]),
      findById: vi.fn().mockResolvedValue(undefined),
      save: vi.fn(),
      remove: vi.fn(),
    };

    useCases = new EvaluationUseCases(testRepo, evalRepo, personaRepo, settingsRepo, projectRepo, aiService, "test-bucket");
  });

  describe("executeTest - normal completion", () => {
    it("sets status to completed with summaries via updateFields", async () => {
      const completedEvals = [makeEval("p1", "A"), makeEval("p2", "B"), makeEval("p3", "A")];
      (evalRepo.findAllByTest as ReturnType<typeof vi.fn>).mockResolvedValue(completedEvals);

      await useCases.executeTest("u1", "t1", {
        buildImageSource: () => ({ kind: "bytes", data: Buffer.from(""), format: "png" }),
      });

      const calls = (testRepo.updateFields as ReturnType<typeof vi.fn>).mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[2].status).toBe("completed");
      expect(lastCall[2].reasonSummaryStatus).toBe("ready");
    });
  });

  describe("executeTest - abort with completed evals (ここで締める)", () => {
    it("generates summaries from completed evals and sets completed", async () => {
      const ac = new AbortController();

      const completedEvals = [makeEval("p1", "A"), makeEval("p2", "B")];
      (evalRepo.findAllByTest as ReturnType<typeof vi.fn>).mockResolvedValue(completedEvals);

      let batchCount = 0;
      (aiService.evaluateDesigns as ReturnType<typeof vi.fn>).mockImplementation(async () => {
        batchCount++;
        if (batchCount >= 2) ac.abort();
        return { winner: "A", confidence: 85, reason: "A wins", scoresA: scores(8), scoresB: scores(5) };
      });

      await useCases.executeTest("u1", "t1", {
        buildImageSource: () => ({ kind: "bytes", data: Buffer.from(""), format: "png" }),
        onAbort: ac.signal,
      });

      const calls = (testRepo.updateFields as ReturnType<typeof vi.fn>).mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[2].status).toBe("completed");
      expect(lastCall[2].reasonSummaryStatus).toBe("ready");
      expect(aiService.summarizeReasons).toHaveBeenCalled();
    });
  });

  describe("executeTest - abort with zero completed evals", () => {
    it("sets status to failed when no evals completed", async () => {
      const ac = new AbortController();
      ac.abort();

      (evalRepo.findAllByTest as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await useCases.executeTest("u1", "t1", {
        buildImageSource: () => ({ kind: "bytes", data: Buffer.from(""), format: "png" }),
        onAbort: ac.signal,
      });

      const calls = (testRepo.updateFields as ReturnType<typeof vi.fn>).mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[2].status).toBe("failed");
      expect(aiService.summarizeReasons).not.toHaveBeenCalled();
    });
  });

  describe("executeTest - DB-based abort (worker mode)", () => {
    it("breaks loop when test status changes from running", async () => {
      let callCount = 0;
      (testRepo.findById as ReturnType<typeof vi.fn>).mockImplementation(async () => {
        callCount++;
        if (callCount <= 1) return makeTest({ status: "draft" });
        if (callCount === 2) return makeTest({ status: "running" });
        return makeTest({ status: "failed" });
      });

      const completedEvals = [makeEval("p1", "A")];
      (evalRepo.findAllByTest as ReturnType<typeof vi.fn>).mockResolvedValue(completedEvals);

      await useCases.executeTest("u1", "t1", {
        buildImageSource: () => ({ kind: "bytes", data: Buffer.from(""), format: "png" }),
      });

      const calls = (testRepo.updateFields as ReturnType<typeof vi.fn>).mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[2].status).toBe("completed");
    });
  });
});
