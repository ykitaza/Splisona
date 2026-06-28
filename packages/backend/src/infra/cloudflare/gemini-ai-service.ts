import type { AIService, ConversationMessage, EvaluateDesignsParams } from "../../domain/ports/ai-service.js";
import { personaTypeLabel } from "../../domain/types.js";
import type { DraftResult, EvaluationInput, ReasonSummary } from "../../domain/types.js";

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
    const prompt = [
      `あなたは「${persona.displayName}」というペルソナです。`,
      `タイプ: ${personaTypeLabel(persona.type)}`,
      persona.occupation ? `職業: ${persona.occupation}` : null,
      persona.freeText ? `詳細: ${persona.freeText}` : null,
      projectContext ? `\nデザインの背景:\n${projectContext}` : null,
      "",
      "最初の画像がデザインA、次の画像がデザインBです。",
      "あなたのペルソナ視点から評価してください。",
      "scoresA と scoresB に、A案・B案それぞれの各軸スコア（0〜100）を採点してください。reason は必ず日本語で記述してください。",
      focusPoints ? `\n注目ポイント:\n${focusPoints}` : null,
      additionalInstruction ? `\n追加指示:\n${additionalInstruction}` : null,
    ].filter((l) => l !== null).join("\n");

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
    };
  }

  async generateTitle(imageA: EvaluateDesignsParams["imageA"], imageB: EvaluateDesignsParams["imageA"]): Promise<string> {
    const parts: GeminiPart[] = [
      { text: "2つのデザイン画像を見て、この比較テストに適した短いタイトルを1つだけ日本語で生成してください。15文字以内で、内容が分かる簡潔な名称にしてください。" },
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

  private async generate(request: GeminiRequest): Promise<string> {
    const url = `${BASE_URL}/${this.modelId}:generateContent`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": this.apiKey,
      },
      body: JSON.stringify(request),
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
