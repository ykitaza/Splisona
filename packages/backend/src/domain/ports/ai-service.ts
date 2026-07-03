import type { DraftResult, EvaluationInput, ImprovementReport, ReasonSummary } from "../types.js";

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface EvaluateDesignsParams {
  persona: {
    displayName: string;
    type: string;
    age?: number;
    gender?: string;
    occupation?: string;
    annualIncome?: number;
    education?: string;
    deviationScore?: number;
    freeText?: string;
  };
  imageA: ImageSource;
  imageB: ImageSource;
  additionalInstruction?: string;
  projectContext?: string;
  focusPoints?: string;
}

export type ImageSource =
  | { kind: "s3"; bucket: string; key: string }
  | { kind: "bytes"; data: Buffer; format: "png" | "jpeg" | "gif" | "webp" };

export interface AIService {
  generateDraft(personaName: string, attributes: string): Promise<DraftResult>;
  chat(systemPrompt: string, messages: ConversationMessage[]): Promise<string>;
  evaluateDesigns(params: EvaluateDesignsParams): Promise<EvaluationInput>;
  summarizeReasons(reasonsText: string): Promise<ReasonSummary>;
  generateImprovementSuggestions(requestText: string): Promise<ImprovementReport>;
  generateTitle(imageA: ImageSource, imageB: ImageSource): Promise<string>;
}
