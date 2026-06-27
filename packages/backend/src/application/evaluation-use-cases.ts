import type { ABTestRepository } from "../domain/ports/abtest-repository.js";
import type { EvaluationRepository } from "../domain/ports/evaluation-repository.js";
import type { PersonaRepository } from "../domain/ports/persona-repository.js";
import type { SettingsRepository } from "../domain/ports/settings-repository.js";
import type { AIService, ImageSource } from "../domain/ports/ai-service.js";
import type { ABTest, Evaluation, EvaluationScores } from "../domain/types.js";
import { NotFoundError, ValidationError, ConflictError } from "./errors.js";

export class EvaluationUseCases {
  constructor(
    private readonly testRepo: ABTestRepository,
    private readonly evalRepo: EvaluationRepository,
    private readonly personaRepo: PersonaRepository,
    private readonly settingsRepo: SettingsRepository,
    private readonly aiService: AIService,
    private readonly imageBucket: string,
  ) {}

  async executeTest(
    userId: string,
    testId: string,
    opts?: { buildImageSource?: (key: string) => ImageSource; onAbort?: AbortSignal },
  ): Promise<void> {
    const test = await this.testRepo.findById(userId, testId);
    if (!test) throw new NotFoundError("ABTest");
    if (test.status === "running") throw new ConflictError("Test is already running");
    if (!test.designAImageKey || !test.designBImageKey) {
      throw new ValidationError("Both design images must be set");
    }
    if (!test.personaIds || test.personaIds.length === 0) {
      throw new ValidationError("At least one persona must be selected");
    }

    await this.evalRepo.removeAllByTest(testId);

    const runningTest: ABTest = {
      ...test,
      status: "running",
      reasonSummaryStatus: undefined,
      reasonSummaryA: undefined,
      reasonSummaryB: undefined,
      winnersReasonSummary: undefined,
      updatedAt: new Date().toISOString(),
    };
    await this.testRepo.save(runningTest);

    const buildSrc = opts?.buildImageSource ?? ((key: string): ImageSource => ({
      kind: "s3",
      bucket: this.imageBucket,
      key,
    }));

    const batches = chunkArray(test.personaIds, 25);
    for (const batch of batches) {
      if (opts?.onAbort?.aborted) break;
      await Promise.allSettled(
        batch.map((personaId) =>
          this.evaluateOnePersona(testId, personaId, userId, buildSrc(test.designAImageKey!), buildSrc(test.designBImageKey!))
        )
      );
    }

    if (opts?.onAbort?.aborted) return;

    const evals = await this.evalRepo.findAllByTest(testId);
    const completedEvals = evals.filter((e) => e.status === "completed");
    const summaryFields = await this.generateReasonSummaryFields(completedEvals);

    const completedTest: ABTest = {
      ...runningTest,
      status: "completed",
      ...summaryFields,
      updatedAt: new Date().toISOString(),
    };
    await this.testRepo.save(completedTest);
  }

  async abortTest(userId: string, testId: string): Promise<void> {
    const test = await this.testRepo.findById(userId, testId);
    if (!test) throw new NotFoundError("ABTest");
    await this.testRepo.save({ ...test, status: "failed", updatedAt: new Date().toISOString() });
  }

  async generateReasonSummaryFields(completed: Evaluation[]): Promise<{
    reasonSummaryStatus: "ready";
    reasonSummaryA: string[];
    reasonSummaryB: string[];
    winnersReasonSummary: string;
  }> {
    const countA = completed.filter((e) => e.winner === "A").length;
    const countB = completed.filter((e) => e.winner === "B").length;
    const winner: "A" | "B" | "tie" = countA > countB ? "A" : countB > countA ? "B" : "tie";

    const { reasonsA, reasonsB } = await this.summarizeReasons(completed);
    const winnerReasons = winner === "A" ? reasonsA : winner === "B" ? reasonsB : [];
    return {
      reasonSummaryStatus: "ready",
      reasonSummaryA: reasonsA,
      reasonSummaryB: reasonsB,
      winnersReasonSummary: winnerReasons.join("、"),
    };
  }

  private async evaluateOnePersona(
    testId: string,
    personaId: string,
    userId: string,
    imageA: ImageSource,
    imageB: ImageSource,
  ): Promise<void> {
    const persona = await this.personaRepo.findById(userId, personaId);
    const personaDisplayName = persona?.displayName ?? personaId;

    const additional = await this.getAdditionalInstruction(userId, "evaluation");

    try {
      const input = await this.aiService.evaluateDesigns({
        persona: {
          displayName: personaDisplayName,
          type: persona?.type ?? "consumer",
          occupation: persona?.occupation,
          freeText: persona?.freeText,
        },
        imageA,
        imageB,
        additionalInstruction: additional,
      });

      const evalRecord: Evaluation = {
        testId,
        personaId,
        winner: input.winner,
        confidence: input.confidence,
        reason: input.reason,
        scoresA: input.scoresA,
        scoresB: input.scoresB,
        status: "completed",
        personaDisplayName,
        evaluatedAt: new Date().toISOString(),
      };
      await this.evalRepo.save(evalRecord);
    } catch {
      const zeroScores: EvaluationScores = { usability: 0, aesthetics: 0, clarity: 0, engagement: 0, trust: 0 };
      const failRecord: Evaluation = {
        testId,
        personaId,
        winner: "none",
        confidence: 0,
        reason: "",
        scoresA: zeroScores,
        scoresB: zeroScores,
        status: "failed",
        personaDisplayName,
        evaluatedAt: new Date().toISOString(),
      };
      await this.evalRepo.save(failRecord);
    }
  }

  private async summarizeReasons(
    completed: Evaluation[],
  ): Promise<{ reasonsA: string[]; reasonsB: string[] }> {
    const a = completed.filter((e) => e.winner === "A" && e.reason);
    const b = completed.filter((e) => e.winner === "B" && e.reason);
    if (a.length === 0 && b.length === 0) return { reasonsA: [], reasonsB: [] };

    const fallback = () => ({
      reasonsA: dedupe(a.map((e) => e.reason)).slice(0, 4),
      reasonsB: dedupe(b.map((e) => e.reason)).slice(0, 4),
    });

    try {
      const text = [
        "A案を支持したペルソナの理由:",
        ...(a.length ? a.map((e) => `- ${e.personaDisplayName}: ${e.reason}`) : ["- （該当なし）"]),
        "",
        "B案を支持したペルソナの理由:",
        ...(b.length ? b.map((e) => `- ${e.personaDisplayName}: ${e.reason}`) : ["- （該当なし）"]),
        "",
        "上記を踏まえ、summarize_reasons ツールで、A案が支持された理由とB案が評価された点を、それぞれ簡潔な日本語の箇条書きにまとめてください。似た意見は1項目に統合してください。",
      ].join("\n");

      const result = await this.aiService.summarizeReasons(text);
      return {
        reasonsA: dedupe(result.reasonsA),
        reasonsB: dedupe(result.reasonsB),
      };
    } catch {
      return fallback();
    }
  }

  private async getAdditionalInstruction(userId: string, templateId: string): Promise<string> {
    const record = await this.settingsRepo.findBySection(userId, "prompt");
    const data = record?.data as Record<string, { additionalInstruction?: string }> | undefined;
    return data?.[templateId]?.additionalInstruction ?? "";
  }
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function dedupe(items: string[]): string[] {
  return [...new Set(items.map((s) => s.trim()).filter(Boolean))];
}
