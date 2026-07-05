import { SEGMENT_OVERLAP } from "@chorus/shared";
import type { AIService, ConversationMessage, EvaluateDesignsParams, ImageSource } from "../../domain/ports/ai-service.js";
import { personaTypeLabel } from "../../domain/types.js";
import { improvementSuggestionsSchema } from "../../domain/services/improvement-prompt.js";
import { buildEvaluationPrompt } from "../../domain/services/evaluation-prompt.js";
import type { DraftResult, EvaluationInput, ImprovementReport, ReasonSummary } from "../../domain/types.js";

interface AiBinding {
  run(model: string, input: Record<string, unknown>): Promise<unknown>;
}

const DEFAULT_MODEL = "@cf/google/gemma-4-26b-a4b-it";

export class WorkersAIService implements AIService {
  constructor(
    private readonly ai: AiBinding,
    private readonly modelId: string = DEFAULT_MODEL,
  ) {}

  async generateDraft(personaName: string, attributes: string): Promise<DraftResult> {
    const result = await this.run([
      { role: "system", content: "あなたはペルソナ設計の専門家です。与えられた属性から人物像の自由記述と推奨説明を日本語で生成してください。" },
      { role: "user", content: `ペルソナ名: ${personaName}\n${attributes}\n\nこのペルソナの自由記述（freeText）と推奨説明（suggestedDescription）をJSON形式で生成してください。` },
    ], {
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "draft_result",
          schema: {
            type: "object",
            properties: {
              freeText: { type: "string" },
              suggestedDescription: { type: "string" },
            },
            required: ["freeText", "suggestedDescription"],
          },
        },
      },
    });
    return JSON.parse(result) as DraftResult;
  }

  async chat(systemPrompt: string, messages: ConversationMessage[]): Promise<string> {
    const msgs = [
      { role: "system" as const, content: systemPrompt },
      ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    ];
    return this.run(msgs);
  }

  async evaluateDesigns(params: EvaluateDesignsParams): Promise<EvaluationInput> {
    const { persona, imagesA, imagesB, additionalInstruction, projectContext, focusPoints } = params;
    const prompt = buildEvaluationPrompt({
      persona,
      projectContext,
      focusPoints,
      additionalInstruction,
      evaluateInstruction: "あなたのペルソナ視点から評価してください。",
      segmentation: { countA: imagesA.length, countB: imagesB.length, overlapPx: SEGMENT_OVERLAP },
    });

    const images = [...imagesA, ...imagesB].map(toBase64);

    const result = await this.runWithImages(prompt, images, {
      temperature: 0.2,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "evaluation",
          schema: evaluateDesignsSchema,
        },
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

  async generateTitle(imageA: ImageSource, imageB: ImageSource): Promise<string> {
    const images = [toBase64(imageA), toBase64(imageB)];
    const result = await this.runWithImages(
      "2つのデザイン画像を見て、それぞれの題材（サービス名・ブランド名・ページの主題など）を短く特定し、「A側の題材 | B側の題材」の形式でタイトルを生成してください（例: 楽天Pay | PayPay）。各側は10文字以内の日本語または固有名詞。両方が同じ題材の場合のみ「◯◯ 新旧比較」のような形式にしてください。タイトルのみを出力し、他の説明は不要です。",
      images,
      { temperature: 0.3 },
    );
    return result.trim().replace(/^["「]|["」]$/g, "");
  }

  async summarizeReasons(reasonsText: string): Promise<ReasonSummary> {
    const result = await this.run([
      { role: "user", content: reasonsText },
    ], {
      temperature: 0.2,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "reason_summary",
          schema: {
            type: "object",
            properties: {
              reasonsA: { type: "array", items: { type: "string" } },
              reasonsB: { type: "array", items: { type: "string" } },
            },
            required: ["reasonsA", "reasonsB"],
          },
        },
      },
    });
    return JSON.parse(result) as ReasonSummary;
  }

  private async run(
    messages: Array<{ role: string; content: string }>,
    opts?: Record<string, unknown>,
  ): Promise<string> {
    const response = await this.ai.run(this.modelId, { messages, ...opts });
    return this.extractResponse(response);
  }

  async generateImprovementSuggestions(requestText: string): Promise<ImprovementReport> {
    const result = await this.run([{ role: "user", content: requestText }], {
      temperature: 0.3,
      response_format: {
        type: "json_schema",
        json_schema: { name: "improvements", schema: improvementSuggestionsSchema },
      },
    });
    const parsed = JSON.parse(result) as ImprovementReport;
    return { ...parsed, suggestions: parsed.suggestions ?? [] };
  }

  private async runWithImages(
    prompt: string,
    images: string[],
    opts?: Record<string, unknown>,
  ): Promise<string> {
    const imageContent = images.map((b64) => ({
      type: "image_url" as const,
      image_url: { url: b64 },
    }));

    const messages = [{
      role: "user",
      content: [
        ...imageContent,
        { type: "text" as const, text: prompt },
      ],
    }];

    const response = await this.ai.run(this.modelId, { messages, ...opts });
    return this.extractResponse(response);
  }

  private extractResponse(response: unknown): string {
    if (!response) throw new Error("Workers AI returned null/undefined");
    const r = response as Record<string, unknown>;
    if (typeof r.response === "string") return r.response;
    if (typeof r.result === "string") return r.result;
    if (r.choices && Array.isArray(r.choices)) {
      const msg = (r.choices[0] as Record<string, unknown>)?.message as Record<string, unknown> | undefined;
      if (msg?.content && typeof msg.content === "string") return msg.content;
    }
    throw new Error(`Unexpected Workers AI response format: ${JSON.stringify(response).slice(0, 500)}`);
  }
}

function toBase64(src: ImageSource): string {
  if (src.kind === "bytes") {
    const mime = src.format === "jpeg" ? "image/jpeg"
      : src.format === "webp" ? "image/webp"
      : src.format === "gif" ? "image/gif"
      : "image/png";
    return `data:${mime};base64,${src.data.toString("base64")}`;
  }
  throw new Error("Workers AI Service does not support S3 URIs directly. Use bytes instead.");
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
