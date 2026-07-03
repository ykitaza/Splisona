import type { AIService, ConversationMessage, EvaluateDesignsParams } from "../../domain/ports/ai-service.js";
import { personaTypeLabel } from "../../domain/types.js";
import { buildEvaluationPrompt } from "../../domain/services/evaluation-prompt.js";
import type { DraftResult, EvaluationInput, ImprovementReport, ReasonSummary } from "../../domain/types.js";
import { improvementSuggestionsSchema } from "../../domain/services/improvement-prompt.js";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

export class GeminiAIService implements AIService {
  constructor(
    private readonly apiKey: string,
    private readonly modelId: string = "gemini-2.5-flash",
  ) {}

  async generateDraft(personaName: string, attributes: string): Promise<DraftResult> {
    const result = await this.generate({
      contents: [{
        role: "user",
        parts: [{ text: `ペルソナ名: ${personaName}\n${attributes}\n\nこのペルソナの自由記述（freeText）と推奨説明（suggestedDescription）を日本語で生成してください。` }],
      }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            freeText: { type: "string" },
            suggestedDescription: { type: "string" },
          },
          required: ["freeText", "suggestedDescription"],
        },
      },
      systemInstruction: {
        parts: [{ text: "あなたはペルソナ設計の専門家です。与えられた属性から人物像の自由記述と推奨説明を日本語で生成してください。" }],
      },
    });

    return JSON.parse(result) as DraftResult;
  }

  async chat(systemPrompt: string, messages: ConversationMessage[]): Promise<string> {
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    return this.generate({
      contents,
      systemInstruction: { parts: [{ text: systemPrompt }] },
    });
  }

  async evaluateDesigns(params: EvaluateDesignsParams): Promise<EvaluationInput> {
    const { persona, imageA, imageB, additionalInstruction, projectContext, focusPoints } = params;
    const prompt = buildEvaluationPrompt({
      persona,
      projectContext,
      focusPoints,
      additionalInstruction,
      evaluateInstruction: "あなたのペルソナ視点から評価してください。",
    });

    const parts: GeminiPart[] = [{ text: prompt }];
    parts.push(toImagePart(imageA));
    parts.push(toImagePart(imageB));

    const result = await this.generate({
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: evaluateDesignsSchema,
      },
    });

    const input = JSON.parse(result) as EvaluationInput;
    return {
      winner: input.winner,
      confidence: input.confidence ?? 0,
      reason: input.reason,
      scoresA: input.scoresA,
      scoresB: input.scoresB,
      resolvedPrompt: prompt,
    };
  }

  async generateTitle(imageA: EvaluateDesignsParams["imageA"], imageB: EvaluateDesignsParams["imageA"]): Promise<string> {
    const parts: GeminiPart[] = [
      { text: "2つのデザイン画像を見て、それぞれの題材（サービス名・ブランド名・ページの主題など）を短く特定し、「A側の題材 | B側の題材」の形式でタイトルを生成してください（例: 楽天Pay | PayPay）。各側は10文字以内の日本語または固有名詞。両方が同じ題材の場合のみ「◯◯ 新旧比較」のような形式にしてください。タイトルのみを出力し、他の説明は不要です。" },
      toImagePart(imageA),
      toImagePart(imageB),
    ];

    const result = await this.generate({
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: { title: { type: "string" } },
          required: ["title"],
        },
      },
    });

    const parsed = JSON.parse(result) as { title: string };
    return parsed.title.replace(/^["「]|["」]$/g, "");
  }

  async summarizeReasons(reasonsText: string): Promise<ReasonSummary> {
    const result = await this.generate({
      contents: [{
        role: "user",
        parts: [{ text: reasonsText }],
      }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            reasonsA: {
              type: "array",
              items: { type: "string" },
              description: "A案が支持された理由。3〜4項目。",
            },
            reasonsB: {
              type: "array",
              items: { type: "string" },
              description: "B案が評価された点。2〜4項目。",
            },
          },
          required: ["reasonsA", "reasonsB"],
        },
      },
    });

    return JSON.parse(result) as ReasonSummary;
  }

  async generateImprovementSuggestions(requestText: string): Promise<ImprovementReport> {
    const result = await this.generate({
      contents: [{ role: "user", parts: [{ text: requestText }] }],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: "application/json",
        responseSchema: improvementSuggestionsSchema,
      },
    });
    const parsed = JSON.parse(result) as ImprovementReport;
    return { ...parsed, suggestions: parsed.suggestions ?? [] };
  }

  private async generate(request: GeminiRequest): Promise<string> {
    const url = `${BASE_URL}/${this.modelId}:generateContent`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": this.apiKey,
      },
      body: JSON.stringify(request),
      // 大きな画像ペイロードで応答が返らずハングすると、テストが running のまま固まるため
      signal: AbortSignal.timeout(90_000),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Gemini API error ${res.status}: ${body.slice(0, 500)}`);
    }

    const data = await res.json() as GeminiResponse;
    const candidate = data.candidates?.[0];
    if (!candidate?.content?.parts?.length) {
      throw new Error(`No content in Gemini response: ${JSON.stringify(data).slice(0, 300)}`);
    }

    return candidate.content.parts
      .filter((p) => p.text !== undefined)
      .map((p) => p.text!)
      .join("");
  }
}

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

interface GeminiRequest {
  contents: Array<{
    role?: string;
    parts: GeminiPart[];
  }>;
  generationConfig?: {
    temperature?: number;
    responseMimeType?: string;
    responseSchema?: unknown;
  };
  systemInstruction?: {
    parts: Array<{ text: string }>;
  };
  safetySettings?: Array<{
    category: string;
    threshold: string;
  }>;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

function toImagePart(src: EvaluateDesignsParams["imageA"]): GeminiPart {
  if (src.kind === "bytes") {
    const mimeType = src.format === "jpeg" ? "image/jpeg"
      : src.format === "webp" ? "image/webp"
      : src.format === "gif" ? "image/gif"
      : "image/png";
    return { inlineData: { mimeType, data: src.data.toString("base64") } };
  }
  throw new Error("Gemini AI Service does not support S3 URIs directly. Use bytes instead.");
}

const evaluateDesignsSchema = {
  type: "object",
  properties: {
    winner: { type: "string", enum: ["A", "B", "none"] },
    confidence: { type: "number" },
    reason: { type: "string" },
    scoresA: {
      type: "object",
      properties: {
        usability: { type: "number" },
        aesthetics: { type: "number" },
        clarity: { type: "number" },
        engagement: { type: "number" },
        trust: { type: "number" },
      },
      required: ["usability", "aesthetics", "clarity", "engagement", "trust"],
    },
    scoresB: {
      type: "object",
      properties: {
        usability: { type: "number" },
        aesthetics: { type: "number" },
        clarity: { type: "number" },
        engagement: { type: "number" },
        trust: { type: "number" },
      },
      required: ["usability", "aesthetics", "clarity", "engagement", "trust"],
    },
  },
  required: ["winner", "reason", "scoresA", "scoresB"],
};
