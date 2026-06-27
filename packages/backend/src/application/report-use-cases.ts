import type { ABTestRepository } from "../domain/ports/abtest-repository.js";
import type { EvaluationRepository } from "../domain/ports/evaluation-repository.js";
import { toABTestDTO, type ABTest, type Evaluation, type EvaluationScores } from "../domain/types.js";
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

function zeroScores(): EvaluationScores {
  return { usability: 0, aesthetics: 0, clarity: 0, engagement: 0, trust: 0 };
}

function computeSummary(evaluations: Evaluation[], totalPersonas: number) {
  const completed = evaluations.filter((e) => e.status === "completed");
  const completedPersonas = completed.length;

  const countA = completed.filter((e) => e.winner === "A").length;
  const countB = completed.filter((e) => e.winner === "B").length;
  const countNone = completed.filter((e) => e.winner === "none").length;

  const supportRateA = completedPersonas > 0 ? countA / completedPersonas : 0;
  const supportRateB = completedPersonas > 0 ? countB / completedPersonas : 0;
  const supportRateNone = completedPersonas > 0 ? countNone / completedPersonas : 0;

  const winner: "A" | "B" | "tie" =
    countA > countB ? "A" : countB > countA ? "B" : "tie";

  const scoresOf = (e: Evaluation, side: "A" | "B") => {
    const legacy = (e as unknown as { scores?: EvaluationScores }).scores;
    return (side === "A" ? e.scoresA : e.scoresB) ?? legacy ?? zeroScores();
  };

  const sumScores = (side: "A" | "B") =>
    completed.reduce((acc, e) => {
      const s = scoresOf(e, side);
      return {
        usability: acc.usability + s.usability,
        aesthetics: acc.aesthetics + s.aesthetics,
        clarity: acc.clarity + s.clarity,
        engagement: acc.engagement + s.engagement,
        trust: acc.trust + (s.trust ?? 0),
      };
    }, zeroScores());

  const avgOf = (sum: EvaluationScores, count: number) =>
    count > 0
      ? {
          usability: sum.usability / count,
          aesthetics: sum.aesthetics / count,
          clarity: sum.clarity / count,
          engagement: sum.engagement / count,
          trust: sum.trust / count,
        }
      : zeroScores();

  return {
    winner,
    supportRateA,
    supportRateB,
    supportRateNone,
    totalPersonas,
    completedPersonas,
    avgScores: {
      A: avgOf(sumScores("A"), completedPersonas),
      B: avgOf(sumScores("B"), completedPersonas),
    },
    winnersReasonSummary: "",
    reasonSummaryA: [] as string[],
    reasonSummaryB: [] as string[],
    reasonSummaryStatus: undefined as "generating" | "ready" | undefined,
  };
}

