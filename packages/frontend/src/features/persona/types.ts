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

export const PERSONA_TYPE_DESCRIPTIONS: Record<PersonaType, string> = {
  action_oriented: "直感や第一印象で素早く判断する。視覚的なインパクトやCTAの目立ちやすさを重視する。",
  cautious: "リスクを避け、情報を十分に確認してから判断する。信頼性や安心感を重視する。",
  info_savvy: "最新トレンドや詳細情報を積極的に収集する。情報量の多さやデータの透明性を重視する。",
  efficiency: "最短経路で目的を達成したい。導線のわかりやすさや操作ステップの少なさを重視する。",
  cost_conscious: "費用対効果を最も重視する。価格表示の明確さや割引・特典の訴求を評価する。",
  trend_sensitive: "流行やビジュアルの洗練度に敏感。デザインの新しさやブランドイメージを重視する。",
  other: "上記に当てはまらない独自の評価軸を持つ。",
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
