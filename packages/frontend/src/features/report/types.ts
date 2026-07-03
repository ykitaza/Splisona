import type { ABTest } from '@/features/test/types';

export interface EvaluationScores {
  usability: number;
  aesthetics: number;
  clarity: number;
  engagement: number;
  trust: number;
}

export interface EvaluationResult {
  personaId: string;
  personaDisplayName: string;
  winner: "A" | "B" | "none";
  confidence: number;
  reason: string;
  scoresA: EvaluationScores;
  scoresB: EvaluationScores;
  status: "evaluating" | "completed" | "failed";
  resolvedPrompt?: string;
  modelId?: string;
}

export interface ImprovementSuggestion {
  target: "A" | "B";
  kind: "weakness" | "transplant";
  title: string;
  evidence: string;
  quote?: string;
  implementationPrompt: string;
}

export interface ImprovementReport {
  designSummaryA?: string;
  designSummaryB?: string;
  suggestions: ImprovementSuggestion[];
}

export interface ReportSummary {
  winner: "A" | "B" | "tie";
  supportRateA: number;
  supportRateB: number;
  supportRateNone: number;
  totalPersonas: number;
  completedPersonas: number;
  avgScores: {
    A: EvaluationScores;
    B: EvaluationScores;
  };
  winnersReasonSummary: string;
  reasonSummaryA: string[];
  reasonSummaryB: string[];
  reasonSummaryStatus?: "generating" | "generating_suggestions" | "ready";
  improvementReport?: ImprovementReport;
}

export interface ReportResponse {
  abTest: ABTest;
  summary: ReportSummary;
  evaluations: EvaluationResult[];
}
