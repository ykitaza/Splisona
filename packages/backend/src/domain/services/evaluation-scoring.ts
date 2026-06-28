import type { Evaluation, EvaluationScores } from "../types.js";

export type Winner = "A" | "B" | "tie";

export interface EvaluationSummary {
  winner: Winner;
  supportRateA: number;
  supportRateB: number;
  supportRateNone: number;
  totalPersonas: number;
  completedPersonas: number;
  avgScores: { A: EvaluationScores; B: EvaluationScores };
  winnersReasonSummary: string;
  reasonSummaryA: string[];
  reasonSummaryB: string[];
  reasonSummaryStatus: "generating" | "ready" | undefined;
}

export function determineWinner(evaluations: Evaluation[]): Winner {
  const completed = evaluations.filter((e) => e.status === "completed");
  const countA = completed.filter((e) => e.winner === "A").length;
  const countB = completed.filter((e) => e.winner === "B").length;
  return countA > countB ? "A" : countB > countA ? "B" : "tie";
}

export function computeSummary(evaluations: Evaluation[], totalPersonas: number): EvaluationSummary {
  const completed = evaluations.filter((e) => e.status === "completed");
  const completedPersonas = completed.length;

  const countA = completed.filter((e) => e.winner === "A").length;
  const countB = completed.filter((e) => e.winner === "B").length;
  const countNone = completed.filter((e) => e.winner === "none").length;

  const supportRateA = completedPersonas > 0 ? countA / completedPersonas : 0;
  const supportRateB = completedPersonas > 0 ? countB / completedPersonas : 0;
  const supportRateNone = completedPersonas > 0 ? countNone / completedPersonas : 0;

  const winner = determineWinner(evaluations);

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
    reasonSummaryA: [],
    reasonSummaryB: [],
    reasonSummaryStatus: undefined,
  };
}

export function buildReasonSummaryFields(
  completed: Evaluation[],
  reasonsA: string[],
  reasonsB: string[],
): {
  reasonSummaryStatus: "ready";
  reasonSummaryA: string[];
  reasonSummaryB: string[];
  winnersReasonSummary: string;
} {
  const winner = determineWinner(completed);
  const winnerReasons = winner === "A" ? reasonsA : winner === "B" ? reasonsB : [];
  return {
    reasonSummaryStatus: "ready",
    reasonSummaryA: reasonsA,
    reasonSummaryB: reasonsB,
    winnersReasonSummary: winnerReasons.join("、"),
  };
}

export function groupReasonsByWinner(completed: Evaluation[]): {
  aReasons: Evaluation[];
  bReasons: Evaluation[];
} {
  return {
    aReasons: completed.filter((e) => e.winner === "A" && e.reason),
    bReasons: completed.filter((e) => e.winner === "B" && e.reason),
  };
}

export function zeroScores(): EvaluationScores {
  return { usability: 0, aesthetics: 0, clarity: 0, engagement: 0, trust: 0 };
}

export function dedupe(items: string[]): string[] {
  return [...new Set(items.map((s) => s.trim()).filter(Boolean))];
}

export function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
