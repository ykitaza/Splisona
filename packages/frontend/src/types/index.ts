export type PersonaType = "consumer" | "business" | "expert" | "elderly" | "youth" | "other";

export const PERSONA_TYPE_LABELS: Record<PersonaType, string> = {
  consumer: "一般消費者",
  business: "ビジネスパーソン",
  expert: "専門家",
  elderly: "シニア",
  youth: "若年層",
  other: "その他",
};

export interface Persona {
  personaId: string;
  userId: string;
  displayName: string;
  type: PersonaType;
  age?: number;
  gender?: string;
  occupation?: string;
  deviationScore?: number;
  annualIncome?: number;
  education?: string;
  freeText?: string;
  createdAt: string;
  updatedAt: string;
}

export type CreatePersonaInput = {
  displayName: string;
  type: PersonaType;
  age?: number;
  gender?: string;
  occupation?: string;
  deviationScore?: number;
  annualIncome?: number;
  education?: string;
  freeText?: string;
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
