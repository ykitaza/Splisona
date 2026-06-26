export interface UserRecord {
  PK: `USER#${string}`;
  SK: `USER#${string}`;
  email: string;
  createdAt: string;
}

export interface PersonaRecord {
  PK: `USER#${string}`;
  SK: `PERSONA#${string}`;
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

export interface ABTestRecord {
  PK: `USER#${string}`;
  SK: `ABTEST#${string}`;
  title: string;
  status: "draft" | "running" | "completed" | "failed";
  designAImageKey?: string;
  designBImageKey?: string;
  designAInputType: "image_upload" | "figma_url" | "site_url";
  designBInputType: "image_upload" | "figma_url" | "site_url";
  designAUrl?: string;
  designBUrl?: string;
  personaIds: string[];
  // AIによる理由要約のキャッシュ（初回のレポート閲覧時に一度だけ生成）
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
}

export interface EvaluationRecord {
  PK: `ABTEST#${string}`;
  SK: `EVAL#${string}`;
  winner: "A" | "B" | "none";
  confidence: number;
  reason: string;
  // A案・B案それぞれを各軸で採点したスコア（旧データは scores を持つ場合がある）
  scoresA: EvaluationScores;
  scoresB: EvaluationScores;
  status: "completed" | "failed";
  personaDisplayName: string;
  evaluatedAt: string;
}
