import type { ABTestRepository } from "../domain/ports/abtest-repository.js";
import type { EvaluationRepository } from "../domain/ports/evaluation-repository.js";
import type { PersonaRepository } from "../domain/ports/persona-repository.js";
import type { SettingsRepository } from "../domain/ports/settings-repository.js";
import type { ProjectRepository } from "../domain/ports/project-repository.js";
import type { AIService, ImageSource } from "../domain/ports/ai-service.js";
import type { ABTest, Evaluation, EvaluationScores } from "../domain/types.js";
import { chunkArray, dedupe, zeroScores, buildReasonSummaryFields, groupReasonsByWinner } from "../domain/services/evaluation-scoring.js";
import { buildImprovementRequestText } from "../domain/services/improvement-prompt.js";
import { NotFoundError, ValidationError, ConflictError } from "./errors.js";

const SCORE_AXES: Array<keyof EvaluationScores> = ["usability", "aesthetics", "clarity", "engagement", "trust"];

export interface IngestEvaluationInput {
  personaId: string;
  winner: "A" | "B" | "none";
  confidence: number;
  reason: string;
  scoresA: EvaluationScores;
  scoresB: EvaluationScores;
  resolvedPrompt?: string;
}

export interface IngestResultsInput {
  model: string;
  evaluations: IngestEvaluationInput[];
  reasonSummary?: { reasonsA: string[]; reasonsB: string[]; winnersReasonSummary: string };
  improvementReport?: ABTest["improvementReport"];
}

export class EvaluationUseCases {
  constructor(
    private readonly testRepo: ABTestRepository,
    private readonly evalRepo: EvaluationRepository,
    private readonly personaRepo: PersonaRepository,
    private readonly settingsRepo: SettingsRepository,
    private readonly projectRepo: ProjectRepository,
    private readonly aiService: AIService,
    private readonly imageBucket: string,
  ) {}

  async executeTest(
    userId: string,
    testId: string,
    opts?: { buildImageSource?: (key: string) => ImageSource | Promise<ImageSource>; onAbort?: AbortSignal },
  ): Promise<void> {
    let test = await this.testRepo.findById(userId, testId);
    if (!test) throw new NotFoundError("ABTest");
    if (test.status === "running") throw new ConflictError("Test is already running");
    if (!test.designAImageKey || !test.designBImageKey) {
      throw new ValidationError("Both design images must be set");
    }
    if (!test.personaIds || test.personaIds.length === 0) {
      throw new ValidationError("At least one persona must be selected");
    }

    await this.evalRepo.removeAllByTest(testId);

    const buildSrc = opts?.buildImageSource ?? ((key: string): ImageSource => ({
      kind: "s3",
      bucket: this.imageBucket,
      key,
    }));

    if (!test.title?.trim()) {
      let generatedTitle: string;
      try {
        const srcA = await buildSrc(test.designAImageKey!);
        const srcB = await buildSrc(test.designBImageKey!);
        generatedTitle = await this.aiService.generateTitle(srcA, srcB);
      } catch (e) {
        console.error("[generateTitle] failed:", e);
        generatedTitle = `A/B テスト ${new Date().toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}`;
      }
      await this.testRepo.updateFields(userId, testId, { title: generatedTitle });
      test = { ...test, title: generatedTitle };
    }

    await this.testRepo.updateFields(userId, testId, {
      status: "running",
      reasonSummaryStatus: undefined,
      reasonSummaryA: undefined,
      reasonSummaryB: undefined,
      winnersReasonSummary: undefined,
      improvementReport: undefined,
      updatedAt: new Date().toISOString(),
    });

    const imageA = await buildSrc(test.designAImageKey!);
    const imageB = await buildSrc(test.designBImageKey!);
    const projectContext = await this.getProjectContext(userId, testId);
    const evalContext = { projectContext, focusPoints: test.focusPoints };
    const batches = chunkArray(test.personaIds, 5);
    for (const batch of batches) {
      if (opts?.onAbort?.aborted) break;
      const current = await this.testRepo.findById(userId, testId);
      if (current && current.status !== "running") break;
      await Promise.allSettled(
        batch.map((personaId, i) =>
          new Promise<void>((r) => setTimeout(r, i * 400)).then(() =>
            this.evaluateOnePersona(testId, personaId, userId, imageA, imageB, evalContext)
          )
        )
      );
    }

    const evals = await this.evalRepo.findAllByTest(testId);
    const completedEvals = evals.filter((e) => e.status === "completed");

    if (completedEvals.length > 0) {
      // フェーズを進捗APIへ露出し、実行中画面のライブログで開始/完了を表示できるようにする
      await this.testRepo.updateFields(userId, testId, { reasonSummaryStatus: "generating", updatedAt: new Date().toISOString() });
      const summaryFields = await this.generateReasonSummaryFields(completedEvals);
      await this.testRepo.updateFields(userId, testId, {
        ...summaryFields,
        reasonSummaryStatus: "generating_suggestions",
        updatedAt: new Date().toISOString(),
      });
      const test2 = await this.testRepo.findById(userId, testId);
      const improvementReport = await this.generateImprovementReport(completedEvals, test2?.focusPoints);
      await this.testRepo.updateFields(userId, testId, {
        status: "completed",
        reasonSummaryStatus: "ready",
        improvementReport,
        updatedAt: new Date().toISOString(),
      });
    } else {
      await this.testRepo.updateFields(userId, testId, {
        status: "failed",
        updatedAt: new Date().toISOString(),
      });
    }
  }

  async ingestResults(userId: string, testId: string, input: IngestResultsInput): Promise<void> {
    const test = await this.testRepo.findById(userId, testId);
    if (!test) throw new NotFoundError("ABTest");
    if (test.status === "running") throw new ConflictError("Test is already running");

    this.validateIngestInput(test, input);

    await this.evalRepo.removeAllByTest(testId);

    const now = new Date().toISOString();
    const completedEvals: Evaluation[] = [];
    for (const e of input.evaluations) {
      const persona = await this.personaRepo.findById(userId, e.personaId);
      const record: Evaluation = {
        testId,
        personaId: e.personaId,
        winner: e.winner,
        confidence: e.confidence,
        reason: e.reason,
        scoresA: e.scoresA,
        scoresB: e.scoresB,
        status: "completed",
        personaDisplayName: persona?.displayName ?? e.personaId,
        evaluatedAt: now,
        resolvedPrompt: e.resolvedPrompt,
        modelId: input.model,
      };
      await this.evalRepo.save(record);
      completedEvals.push(record);
    }

    let summaryFields: { reasonSummaryStatus: "ready"; reasonSummaryA: string[]; reasonSummaryB: string[]; winnersReasonSummary: string };
    if (input.reasonSummary) {
      summaryFields = {
        reasonSummaryStatus: "ready",
        reasonSummaryA: input.reasonSummary.reasonsA,
        reasonSummaryB: input.reasonSummary.reasonsB,
        winnersReasonSummary: input.reasonSummary.winnersReasonSummary,
      };
    } else {
      summaryFields = await this.generateReasonSummaryFields(completedEvals);
    }

    const improvementReport = input.improvementReport ?? await this.generateImprovementReport(completedEvals, test.focusPoints);

    await this.testRepo.updateFields(userId, testId, {
      status: "completed",
      ...summaryFields,
      improvementReport,
      executedBy: `local:${input.model}`,
      updatedAt: new Date().toISOString(),
    });
  }

  private validateIngestInput(test: ABTest, input: IngestResultsInput): void {
    if (!input.model?.trim()) throw new ValidationError("model is required");
    if (!input.evaluations || input.evaluations.length === 0) throw new ValidationError("evaluations must not be empty");

    const seen = new Set<string>();
    for (const e of input.evaluations) {
      if (!test.personaIds.includes(e.personaId)) {
        throw new ValidationError(`Unknown personaId: ${e.personaId}`);
      }
      if (seen.has(e.personaId)) {
        throw new ValidationError(`Duplicate personaId: ${e.personaId}`);
      }
      seen.add(e.personaId);

      if (!["A", "B", "none"].includes(e.winner)) {
        throw new ValidationError(`Invalid winner: ${e.winner}`);
      }
      if (typeof e.confidence !== "number" || e.confidence < 0 || e.confidence > 100) {
        throw new ValidationError(`Invalid confidence for persona ${e.personaId}`);
      }
      for (const side of ["scoresA", "scoresB"] as const) {
        const scores = e[side];
        for (const axis of SCORE_AXES) {
          const v = scores?.[axis];
          if (typeof v !== "number" || Number.isNaN(v) || v < 0 || v > 100) {
            throw new ValidationError(`Invalid ${side}.${axis} for persona ${e.personaId}`);
          }
        }
      }
    }
  }

  private async generateImprovementReport(
    completedEvals: Evaluation[],
    focusPoints: string | undefined,
  ): Promise<ABTest["improvementReport"]> {
    try {
      // 件数と対象を確実にするため、A案用・B案用を別々の推論として実行し target はコードで付与する
      const [resA, resB] = await Promise.all([
        this.aiService.generateImprovementSuggestions(buildImprovementRequestText(completedEvals, focusPoints, "A")),
        this.aiService.generateImprovementSuggestions(buildImprovementRequestText(completedEvals, focusPoints, "B")),
      ]);
      return {
        designSummaryA: resA.designSummaryA || resB.designSummaryA,
        designSummaryB: resA.designSummaryB || resB.designSummaryB,
        suggestions: [
          ...resA.suggestions.map((s) => ({ ...s, target: "A" as const })),
          ...resB.suggestions.map((s) => ({ ...s, target: "B" as const })),
        ],
      };
    } catch (e) {
      // 改善提案の失敗はテスト完了を妨げない
      console.error("[generateImprovementSuggestions] failed:", e);
      return undefined;
    }
  }

  async abortTest(userId: string, testId: string): Promise<void> {
    const test = await this.testRepo.findById(userId, testId);
    if (!test) throw new NotFoundError("ABTest");
    await this.testRepo.updateFields(userId, testId, { status: "failed", updatedAt: new Date().toISOString() });
  }

  async generateReasonSummaryFields(completed: Evaluation[]): Promise<{
    reasonSummaryStatus: "ready";
    reasonSummaryA: string[];
    reasonSummaryB: string[];
    winnersReasonSummary: string;
  }> {
    const { reasonsA, reasonsB } = await this.summarizeReasons(completed);
    return buildReasonSummaryFields(completed, reasonsA, reasonsB);
  }

  private async getProjectContext(userId: string, testId: string): Promise<string> {
    try {
      const projects = await this.projectRepo.findAllByUser(userId);
      const project = projects.find((p) => p.testIds.includes(testId));
      return project?.description ?? "";
    } catch {
      return "";
    }
  }

  private async evaluateOnePersona(
    testId: string,
    personaId: string,
    userId: string,
    imageA: ImageSource,
    imageB: ImageSource,
    context: { projectContext: string; focusPoints?: string },
  ): Promise<void> {
    const persona = await this.personaRepo.findById(userId, personaId);
    const personaDisplayName = persona?.displayName ?? personaId;

    const additional = await this.getAdditionalInstruction(userId, "evaluation");

    await this.evalRepo.save({
      testId, personaId, winner: "none", confidence: 0, reason: "",
      scoresA: zeroScores(), scoresB: zeroScores(),
      status: "evaluating", personaDisplayName, evaluatedAt: new Date().toISOString(),
    });

    try {
      const input = await this.aiService.evaluateDesigns({
        persona: {
          displayName: personaDisplayName,
          type: persona?.type ?? "consumer",
          age: persona?.age,
          gender: persona?.gender,
          occupation: persona?.occupation,
          annualIncome: persona?.annualIncome,
          education: persona?.education,
          deviationScore: persona?.deviationScore,
          freeText: persona?.freeText,
        },
        imageA,
        imageB,
        additionalInstruction: additional,
        projectContext: context.projectContext || undefined,
        focusPoints: context.focusPoints || undefined,
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
        resolvedPrompt: input.resolvedPrompt,
      };
      await this.evalRepo.save(evalRecord);
    } catch {
      const failRecord: Evaluation = {
        testId,
        personaId,
        winner: "none",
        confidence: 0,
        reason: "",
        scoresA: zeroScores(),
        scoresB: zeroScores(),
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
    const { aReasons: a, bReasons: b } = groupReasonsByWinner(completed);
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

