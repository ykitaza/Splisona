export type PersonaType =
  | "action_oriented"
  | "cautious"
  | "info_savvy"
  | "efficiency"
  | "cost_conscious"
  | "trend_sensitive"
  | "other";

export const PERSONA_TYPE_LABELS: Record<PersonaType, string> = {
  action_oriented: "行動重視型",
  cautious: "慎重型",
  info_savvy: "情報感度型",
  efficiency: "効率主義型",
  cost_conscious: "コスパ重視型",
  trend_sensitive: "トレンド敏感型",
  other: "その他",
};

export interface Persona {
  personaId: string;
  userId: string;
  displayName: string;
  type: PersonaType;
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

export type CreatePersonaInput = {
  displayName: string;
  type: PersonaType;
  source?: "preset" | "ai" | "default";
  age?: number;
  gender?: string;
  occupation?: string;
  deviationScore?: number;
  annualIncome?: number;
  education?: string;
  freeText?: string;
  avatarImageKey?: string;
};

export type UpdatePersonaInput = Partial<CreatePersonaInput>;

export interface PersonaDraft {
  freeText: string;
  suggestedDescription: string;
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export type ABTestStatus = "draft" | "running" | "completed" | "failed";

export const ABTEST_STATUS_LABELS: Record<ABTestStatus, string> = {
  draft: "下書き",
  running: "実行中",
  completed: "完了",
  failed: "失敗",
};

export interface DesignInput {
  inputType: "image_upload" | "figma_url" | "site_url";
  imageKey?: string;
  figmaUrl?: string;
  siteUrl?: string;
}

export interface ABTest {
  testId: string;
  userId: string;
  title: string;
  status: ABTestStatus;
  designAInput: DesignInput;
  designBInput: DesignInput;
  personaIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateABTestInput {
  title: string;
  designAInput: DesignInput;
  designBInput: DesignInput;
  personaIds: string[];
}

export type UpdateABTestInput = Partial<CreateABTestInput>;

export interface UploadUrlRequest {
  side: "A" | "B";
  contentType: "image/png" | "image/jpeg" | "image/webp";
}

export interface UploadUrlResponse {
  uploadUrl: string;
  imageKey: string;
}

export interface ProgressResponse {
  total: number;
  completed: number;
  failed: number;
  status: ABTestStatus;
}

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
  status: "completed" | "failed";
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
  reasonSummaryStatus?: "generating" | "ready";
}

export interface ReportResponse {
  abTest: ABTest;
  summary: ReportSummary;
  evaluations: EvaluationResult[];
}
