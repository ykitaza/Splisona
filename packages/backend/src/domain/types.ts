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

export const PERSONA_TYPE_DESCRIPTIONS: Record<string, string> = {
  action_oriented: "直感や第一印象で素早く判断する。視覚的なインパクトやCTAの目立ちやすさを重視する。",
  cautious: "リスクを避け、情報を十分に確認してから判断する。信頼性や安心感を重視する。",
  info_savvy: "最新トレンドや詳細情報を積極的に収集する。情報量の多さやデータの透明性を重視する。",
  efficiency: "最短経路で目的を達成したい。導線のわかりやすさや操作ステップの少なさを重視する。",
  cost_conscious: "費用対効果を最も重視する。価格表示の明確さや割引・特典の訴求を評価する。",
  trend_sensitive: "流行やビジュアルの洗練度に敏感。デザインの新しさやブランドイメージを重視する。",
};

export function personaTypeLabel(type: string): string {
  const desc = PERSONA_TYPE_DESCRIPTIONS[type];
  return desc ? `${type}（${desc}）` : type;
}

export interface ImprovementSuggestion {
  target: "A" | "B";
  /** 根拠の種別: 対象案自身の弱点 or もう一方の案からの強みの移植 */
  kind: "weakness" | "transplant";
  title: string;
  evidence: string;
  quote?: string;
  implementationPrompt: string;
}

export interface ImprovementReport {
  /** 評価コメントから生成した各デザインの1行サマリー */
  designSummaryA?: string;
  designSummaryB?: string;
  suggestions: ImprovementSuggestion[];
}

export interface ABTest {
  testId: string;
  userId: string;
  title: string;
  status: "draft" | "running" | "completed" | "failed";
  designAImageKey?: string;
  designBImageKey?: string;
  designASegmentKeys?: string[];
  designBSegmentKeys?: string[];
  designAInputType: "image_upload" | "figma_url" | "site_url";
  designBInputType: "image_upload" | "figma_url" | "site_url";
  designAUrl?: string;
  designBUrl?: string;
  personaIds: string[];
  focusPoints?: string;
  reasonSummaryStatus?: "generating" | "generating_suggestions" | "ready";
  reasonSummaryA?: string[];
  reasonSummaryB?: string[];
  winnersReasonSummary?: string;
  improvementReport?: ImprovementReport;
  /** ローカル実行された場合の実行元識別子 (例: "local:claude-sonnet-4-5")。undefined=クラウド実行 */
  executedBy?: string;
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
  status: "evaluating" | "completed" | "failed";
  personaDisplayName: string;
  evaluatedAt: string;
  resolvedPrompt?: string;
  modelId?: string;
}

export interface Project {
  projectId: string;
  userId: string;
  name: string;
  description: string;
  testIds: string[];
  createdAt: string;
  updatedAt: string;
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
  resolvedPrompt?: string;
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
      segmentKeys: t.designASegmentKeys,
      ...(t.designAUrl ? (t.designAInputType === "figma_url" ? { figmaUrl: t.designAUrl } : { siteUrl: t.designAUrl }) : {}),
    },
    designBInput: {
      inputType: t.designBInputType,
      imageKey: t.designBImageKey,
      segmentKeys: t.designBSegmentKeys,
      ...(t.designBUrl ? (t.designBInputType === "figma_url" ? { figmaUrl: t.designBUrl } : { siteUrl: t.designBUrl }) : {}),
    },
    personaIds: t.personaIds,
    focusPoints: t.focusPoints,
    executedBy: t.executedBy,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}
