export interface Persona {
  personaId: string;
  userId: string;
  displayName: string;
  type: string;
  source?: "preset" | "ai" | "default";
  age?: number;
  gender?: string;
  occupation?: string;
  deviationScore?: number;
  annualIncome?: number;
  education?: string;
  freeText?: string;
  avatarImageKey?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ABTest {
  testId: string;
  userId: string;
  title: string;
  status: "draft" | "running" | "completed" | "failed";
  designAImageKey?: string;
  designBImageKey?: string;
  designAInputType: "image_upload" | "figma_url" | "site_url";
  designBInputType: "image_upload" | "figma_url" | "site_url";
  designAUrl?: string;
  designBUrl?: string;
  personaIds: string[];
  reasonSummaryStatus?: "generating" | "ready";
  reasonSummaryA?: string[];
  reasonSummaryB?: string[];
  winnersReasonSummary?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EvaluationScores {
  usability: number;
  aesthetics: number;
  clarity: number;
  engagement: number;
  trust: number;
}

export interface Evaluation {
  testId: string;
  personaId: string;
  winner: "A" | "B" | "none";
  confidence: number;
  reason: string;
  scoresA: EvaluationScores;
  scoresB: EvaluationScores;
  status: "completed" | "failed";
  personaDisplayName: string;
  evaluatedAt: string;
}

export interface SettingsRecord {
  section: string;
  data: unknown;
  updatedAt?: string;
}

export interface DraftResult {
  freeText: string;
  suggestedDescription: string;
}

export interface EvaluationInput {
  winner: "A" | "B" | "none";
  confidence: number;
  reason: string;
  scoresA: EvaluationScores;
  scoresB: EvaluationScores;
}

export interface ReasonSummary {
  reasonsA: string[];
  reasonsB: string[];
}

export interface UploadUrlResult {
  uploadUrl: string;
  imageKey: string;
}

export function toABTestDTO(t: ABTest) {
  return {
    testId: t.testId,
    userId: t.userId,
    title: t.title,
    status: t.status,
    designAInput: {
      inputType: t.designAInputType,
      imageKey: t.designAImageKey,
      ...(t.designAUrl ? (t.designAInputType === "figma_url" ? { figmaUrl: t.designAUrl } : { siteUrl: t.designAUrl }) : {}),
    },
    designBInput: {
      inputType: t.designBInputType,
      imageKey: t.designBImageKey,
      ...(t.designBUrl ? (t.designBInputType === "figma_url" ? { figmaUrl: t.designBUrl } : { siteUrl: t.designBUrl }) : {}),
    },
    personaIds: t.personaIds,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}
