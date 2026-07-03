import type { ABTestRepository } from "../domain/ports/abtest-repository.js";
import type { EvaluationRepository } from "../domain/ports/evaluation-repository.js";
import { toABTestDTO, type ABTest } from "../domain/types.js";
import { computeSummary, zeroScores } from "../domain/services/evaluation-scoring.js";
import { NotFoundError } from "./errors.js";

export class ReportUseCases {
  constructor(
    private readonly testRepo: ABTestRepository,
    private readonly evalRepo: EvaluationRepository,
  ) {}

  async listTests(userId: string): Promise<ABTest[]> {
    return this.testRepo.findAllByUser(userId);
  }

  async getReport(userId: string, testId: string) {
    const test = await this.testRepo.findById(userId, testId);
    if (!test) throw new NotFoundError("ABTest");

    const evaluations = await this.evalRepo.findAllByTest(testId);
    const summary = computeSummary(evaluations, test.personaIds.length);

    if (test.status === "completed") {
      summary.reasonSummaryA = test.reasonSummaryA ?? [];
      summary.reasonSummaryB = test.reasonSummaryB ?? [];
      summary.winnersReasonSummary = test.winnersReasonSummary ?? "";
      summary.reasonSummaryStatus = test.reasonSummaryStatus;
      summary.improvementReport = test.improvementReport;
    }

    const evaluationResults = evaluations.map((e) => ({
      personaId: e.personaId,
      personaDisplayName: e.personaDisplayName,
      winner: e.winner,
      confidence: e.confidence,
      reason: e.reason,
      scoresA: e.scoresA,
      scoresB: e.scoresB,
      status: e.status,
      resolvedPrompt: e.resolvedPrompt,
      modelId: e.modelId,
    }));

    return { abTest: toABTestDTO(test), summary, evaluations: evaluationResults };
  }

  async exportReport(userId: string, testId: string): Promise<string> {
    const test = await this.testRepo.findById(userId, testId);
    if (!test) throw new NotFoundError("ABTest");

    const evaluations = await this.evalRepo.findAllByTest(testId);

    const header =
      "personaId,displayName,winner,confidence,reason,A_usability,A_aesthetics,A_clarity,A_engagement,A_trust,B_usability,B_aesthetics,B_clarity,B_engagement,B_trust,status";
    const rows = evaluations.map((e) => {
      const a = e.scoresA ?? zeroScores();
      const b = e.scoresB ?? zeroScores();
      return [
        e.personaId,
        e.personaDisplayName,
        e.winner,
        String(e.confidence),
        `"${e.reason.replace(/"/g, '""')}"`,
        String(a.usability),
        String(a.aesthetics),
        String(a.clarity),
        String(a.engagement),
        String(a.trust ?? 0),
        String(b.usability),
        String(b.aesthetics),
        String(b.clarity),
        String(b.engagement),
        String(b.trust ?? 0),
        e.status,
      ].join(",");
    });

    return [header, ...rows].join("\n");
  }
}


