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
      generateImprovementSuggestions: vi.fn().mockResolvedValue({ suggestions: [] }),
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

  describe("executeTest - segmented design images", () => {
    it("builds imagesA/imagesB from segmentKeys when present and calls aiService.evaluateDesigns with multiple images", async () => {
      const segmentedTest = makeTest({
        designASegmentKeys: ["a-seg0.png", "a-seg1.png"],
        designBSegmentKeys: ["b-seg0.png", "b-seg1.png"],
      });
      let findByIdCallCount = 0;
      (testRepo.findById as ReturnType<typeof vi.fn>).mockImplementation(async () => {
        findByIdCallCount++;
        return { ...segmentedTest, status: findByIdCallCount === 1 ? "draft" as const : "running" as const };
      });

      const completedEvals = [makeEval("p1", "A"), makeEval("p2", "B"), makeEval("p3", "A")];
      (evalRepo.findAllByTest as ReturnType<typeof vi.fn>).mockResolvedValue(completedEvals);

      await useCases.executeTest("u1", "t1", {
        buildImageSource: (key) => ({ kind: "bytes", data: Buffer.from(key), format: "png" }),
      });

      const calls = (aiService.evaluateDesigns as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      for (const [params] of calls) {
        expect(params.imagesA).toHaveLength(2);
        expect(params.imagesB).toHaveLength(2);
      }
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

  describe("ingestResults", () => {
    function makeIngestInput(overrides: Partial<Parameters<EvaluationUseCases["ingestResults"]>[2]> = {}) {
      return {
        model: "claude-sonnet-4-5",
        evaluations: [
          {
            personaId: "p1",
            winner: "A" as const,
            confidence: 80,
            reason: "A is clearer",
            scoresA: scores(8),
            scoresB: scores(5),
          },
          {
            personaId: "p2",
            winner: "B" as const,
            confidence: 70,
            reason: "B feels safer",
            scoresA: scores(4),
            scoresB: scores(7),
          },
        ],
        ...overrides,
      };
    }

    it("saves completed evaluations with modelId and marks the test completed with executedBy", async () => {
      await useCases.ingestResults("u1", "t1", makeIngestInput());

      expect(evalRepo.removeAllByTest).toHaveBeenCalledWith("t1");
      expect(savedEvals).toHaveLength(2);
      for (const e of savedEvals) {
        expect(e.status).toBe("completed");
        expect(e.modelId).toBe("claude-sonnet-4-5");
      }
      expect(savedEvals[0].personaDisplayName).toBe("Test Persona");

      const calls = (testRepo.updateFields as ReturnType<typeof vi.fn>).mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[2].status).toBe("completed");
      expect(lastCall[2].executedBy).toBe("local:claude-sonnet-4-5");
      expect(lastCall[2].reasonSummaryStatus).toBe("ready");
    });

    it("uses generateReasonSummaryFields / generateImprovementSuggestions pipeline when omitted", async () => {
      await useCases.ingestResults("u1", "t1", makeIngestInput());

      expect(aiService.summarizeReasons).toHaveBeenCalled();
      expect(aiService.generateImprovementSuggestions).toHaveBeenCalled();
    });

    it("uses provided reasonSummary / improvementReport without calling the AI pipeline for them", async () => {
      await useCases.ingestResults(
        "u1",
        "t1",
        makeIngestInput({
          reasonSummary: { reasonsA: ["clear layout"], reasonsB: [], winnersReasonSummary: "clear layout" },
          improvementReport: { suggestions: [] },
        }),
      );

      expect(aiService.summarizeReasons).not.toHaveBeenCalled();
      expect(aiService.generateImprovementSuggestions).not.toHaveBeenCalled();

      const calls = (testRepo.updateFields as ReturnType<typeof vi.fn>).mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[2].reasonSummaryA).toEqual(["clear layout"]);
      expect(lastCall[2].winnersReasonSummary).toBe("clear layout");
      expect(lastCall[2].improvementReport).toEqual({ suggestions: [] });
    });

    it("throws NotFoundError when the test does not exist", async () => {
      (testRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      await expect(useCases.ingestResults("u1", "t1", makeIngestInput())).rejects.toThrow("not found");
    });

    it("throws ConflictError when the test is currently running", async () => {
      (testRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeTest({ status: "running" }));
      await expect(useCases.ingestResults("u1", "t1", makeIngestInput())).rejects.toThrow("already running");
    });

    it("throws ValidationError for an unknown personaId", async () => {
      await expect(
        useCases.ingestResults(
          "u1",
          "t1",
          makeIngestInput({
            evaluations: [
              { personaId: "unknown", winner: "A", confidence: 80, reason: "x", scoresA: scores(8), scoresB: scores(5) },
            ],
          }),
        ),
      ).rejects.toThrow(/personaId/);
    });

    it("throws ValidationError when a score is out of range", async () => {
      await expect(
        useCases.ingestResults(
          "u1",
          "t1",
          makeIngestInput({
            evaluations: [
              {
                personaId: "p1",
                winner: "A",
                confidence: 80,
                reason: "x",
                scoresA: { ...scores(8), usability: 150 },
                scoresB: scores(5),
              },
            ],
          }),
        ),
      ).rejects.toThrow(/usability/);
    });
  });
});
