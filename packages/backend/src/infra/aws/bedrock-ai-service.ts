import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import type { AIService, ConversationMessage, EvaluateDesignsParams } from "../../domain/ports/ai-service.js";
import { personaTypeLabel } from "../../domain/types.js";
import { buildEvaluationPrompt } from "../../domain/services/evaluation-prompt.js";
import type { DraftResult, EvaluationInput, ImprovementReport, ReasonSummary } from "../../domain/types.js";

export class BedrockAIService implements AIService {
  constructor(
    private readonly client: BedrockRuntimeClient,
    private readonly modelId: string,
  ) {}

  async generateDraft(personaName: string, attributes: string): Promise<DraftResult> {
    const res = await this.client.send(
      new ConverseCommand({
        modelId: this.modelId,
        system: [{ text: "あなたはペルソナ設計の専門家です。与えられた属性から人物像の自由記述と推奨説明を日本語で生成してください。" }],
        messages: [{
          role: "user",
          content: [{ text: `ペルソナ名: ${personaName}\n${attributes}\n\nこのペルソナの自由記述と推奨説明を generate_draft ツールで返してください。` }],
        }],
        toolConfig: {
          tools: [{
            toolSpec: {
              name: "generate_draft",
              description: "ペルソナの自由記述と推奨説明を生成する",
              inputSchema: {
                json: {
                  type: "object",
                  properties: {
                    freeText: { type: "string" },
                    suggestedDescription: { type: "string" },
                  },
                  required: ["freeText", "suggestedDescription"],
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } as any,
              },
            },
          }],
          toolChoice: { tool: { name: "generate_draft" } },
        },
      })
    );

    const toolUse = (res as { output: { message: { content: { toolUse?: { input: DraftResult } }[] } } })
      .output.message.content.find((c) => (c as { toolUse?: unknown }).toolUse) as
      { toolUse: { input: DraftResult } } | undefined;

    if (!toolUse) throw new Error("No draft generated");
    return toolUse.toolUse.input;
  }

  async chat(systemPrompt: string, messages: ConversationMessage[]): Promise<string> {
    const res = await this.client.send(
      new ConverseCommand({
        modelId: this.modelId,
        system: [{ text: systemPrompt }],
        messages: messages.map((m) => ({
          role: m.role,
          content: [{ text: m.content }],
        })),
      })
    );

    return (
      (res as { output: { message: { content: { text?: string }[] } } })
        .output.message.content
        .filter((c) => c.text !== undefined)
        .map((c) => c.text ?? "")
        .join("")
    );
  }

  async evaluateDesigns(params: EvaluateDesignsParams): Promise<EvaluationInput> {
    const { persona, imagesA, imagesB, additionalInstruction, projectContext, focusPoints } = params;
    const prompt = buildEvaluationPrompt({
      persona,
      projectContext,
      focusPoints,
      additionalInstruction,
      evaluateInstruction: "あなたのペルソナ視点から evaluate_designs ツールを使って評価してください。",
      segmentation: { countA: imagesA.length, countB: imagesB.length, overlapPx: 150 },
    });

    const toImageContent = (src: EvaluateDesignsParams["imagesA"][number]) => {
      if (src.kind === "s3") {
        return { image: { format: "png" as const, source: { s3Location: { uri: `s3://${src.bucket}/${src.key}` } } } };
      }
      return { image: { format: src.format, source: { bytes: src.data } } };
    };

    const command = new ConverseCommand({
      modelId: this.modelId,
      inferenceConfig: { temperature: 0.2 },
      messages: [{
        role: "user",
        content: [
          { text: prompt },
          ...imagesA.map(toImageContent),
          ...imagesB.map(toImageContent),
        ],
      }],
      toolConfig: {
        tools: [{ toolSpec: evaluateDesignsToolSpec }],
        toolChoice: { tool: { name: "evaluate_designs" } },
      },
    });

    const response = await this.invokeWithRetry(command) as {
      stopReason: string;
      output?: { message?: { content?: Array<{ toolUse?: { name: string; input: unknown } }> } };
    };

    if (response.stopReason !== "tool_use") {
      throw new Error(`Unexpected stopReason: ${response.stopReason}`);
    }

    const toolUseBlock = response.output?.message?.content?.find(
      (c) => c.toolUse?.name === "evaluate_designs"
    );
    if (!toolUseBlock?.toolUse) {
      throw new Error("evaluate_designs tool use not found in response");
    }

    const input = toolUseBlock.toolUse.input as EvaluationInput;
    return {
      winner: input.winner,
      confidence: input.confidence ?? 0,
      reason: input.reason,
      scoresA: input.scoresA,
      scoresB: input.scoresB,
      resolvedPrompt: prompt,
    };
  }

  async generateTitle(imageA: EvaluateDesignsParams["imagesA"][number], imageB: EvaluateDesignsParams["imagesA"][number]): Promise<string> {
    const toImageContent = (src: EvaluateDesignsParams["imagesA"][number]) => {
      if (src.kind === "s3") {
        return { image: { format: "png" as const, source: { s3Location: { uri: `s3://${src.bucket}/${src.key}` } } } };
      }
      return { image: { format: src.format, source: { bytes: src.data } } };
    };

    const res = await this.client.send(
      new ConverseCommand({
        modelId: this.modelId,
        inferenceConfig: { temperature: 0.3 },
        messages: [{
          role: "user",
          content: [
            { text: "2つのデザイン画像を見て、それぞれの題材（サービス名・ブランド名・ページの主題など）を短く特定し、「A側の題材 | B側の題材」の形式でタイトルを生成してください（例: 楽天Pay | PayPay）。各側は10文字以内の日本語または固有名詞。両方が同じ題材の場合のみ「◯◯ 新旧比較」のような形式にしてください。タイトルのみを出力し、他の説明は不要です。" },
            toImageContent(imageA),
            toImageContent(imageB),
          ],
        }],
      })
    );

    const text = (res as { output: { message: { content: { text?: string }[] } } })
      .output.message.content
      .filter((c) => c.text !== undefined)
      .map((c) => c.text ?? "")
      .join("");

    return text.trim().replace(/^["「]|["」]$/g, "");
  }

  async summarizeReasons(reasonsText: string): Promise<ReasonSummary> {
    const command = new ConverseCommand({
      modelId: this.modelId,
      inferenceConfig: { temperature: 0.2 },
      messages: [{ role: "user", content: [{ text: reasonsText }] }],
      toolConfig: {
        tools: [{ toolSpec: summarizeReasonsToolSpec }],
        toolChoice: { tool: { name: "summarize_reasons" } },
      },
    });

    const response = (await this.client.send(command)) as {
      output?: { message?: { content?: Array<{ toolUse?: { name: string; input: unknown } }> } };
    };
    const block = response.output?.message?.content?.find(
      (c) => c.toolUse?.name === "summarize_reasons"
    );
    const input = block?.toolUse?.input as { reasonsA?: string[]; reasonsB?: string[] } | undefined;
    if (!input) throw new Error("summarize_reasons tool use not found");

    return {
      reasonsA: Array.isArray(input.reasonsA) ? input.reasonsA : [],
      reasonsB: Array.isArray(input.reasonsB) ? input.reasonsB : [],
    };
  }

  async generateImprovementSuggestions(requestText: string): Promise<ImprovementReport> {
    const command = new ConverseCommand({
      modelId: this.modelId,
      inferenceConfig: { temperature: 0.3 },
      messages: [{ role: "user", content: [{ text: requestText }] }],
      toolConfig: {
        tools: [{ toolSpec: improvementSuggestionsToolSpec }],
        toolChoice: { tool: { name: "suggest_improvements" } },
      },
    });

    const response = (await this.invokeWithRetry(command)) as {
      output?: { message?: { content?: Array<{ toolUse?: { name: string; input: unknown } }> } };
    };
    const block = response.output?.message?.content?.find(
      (c) => c.toolUse?.name === "suggest_improvements"
    );
    const input = block?.toolUse?.input as ImprovementReport | undefined;
    if (!input?.suggestions) throw new Error("suggest_improvements tool use not found");
    return input;
  }

  private async invokeWithRetry(command: ConverseCommand, maxRetries = 3): Promise<unknown> {
    let lastError: unknown;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.client.send(command);
      } catch (e: unknown) {
        const name = (e as { name?: string }).name;
        if (name === "ThrottlingException" && attempt < maxRetries - 1) {
          await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
          lastError = e;
        } else {
          throw e;
        }
      }
    }
    throw lastError;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const evaluateDesignsToolSpec: any = {
  name: "evaluate_designs",
  description: "デザインA/Bのどちらがペルソナ視点で優れているかを評価し、各案を軸ごとに採点する",
  inputSchema: {
    json: {
      type: "object",
      properties: {
        winner: { type: "string", enum: ["A", "B", "none"] },
        confidence: { type: "number", minimum: 0, maximum: 100 },
        reason: { type: "string" },
        scoresA: {
          type: "object",
          description: "デザインA案の各軸スコア（0〜100）",
          properties: {
            usability: { type: "number", minimum: 0, maximum: 100 },
            aesthetics: { type: "number", minimum: 0, maximum: 100 },
            clarity: { type: "number", minimum: 0, maximum: 100 },
            engagement: { type: "number", minimum: 0, maximum: 100 },
            trust: { type: "number", minimum: 0, maximum: 100 },
          },
          required: ["usability", "aesthetics", "clarity", "engagement", "trust"],
        },
        scoresB: {
          type: "object",
          description: "デザインB案の各軸スコア（0〜100）",
          properties: {
            usability: { type: "number", minimum: 0, maximum: 100 },
            aesthetics: { type: "number", minimum: 0, maximum: 100 },
            clarity: { type: "number", minimum: 0, maximum: 100 },
            engagement: { type: "number", minimum: 0, maximum: 100 },
            trust: { type: "number", minimum: 0, maximum: 100 },
          },
          required: ["usability", "aesthetics", "clarity", "engagement", "trust"],
        },
      },
      required: ["winner", "reason", "scoresA", "scoresB"],
    },
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const summarizeReasonsToolSpec: any = {
  name: "summarize_reasons",
  description: "複数ペルソナの評価コメントを横断して、A案が支持された理由とB案が評価された点を、それぞれ簡潔な日本語の箇条書きにまとめる",
  inputSchema: {
    json: {
      type: "object",
      properties: {
        reasonsA: {
          type: "array",
          items: { type: "string" },
          description: "A案が支持された理由。3〜4項目。似た意見は1項目に統合し、体言止め〜一文で簡潔に。A案支持者がいなければ空配列。",
        },
        reasonsB: {
          type: "array",
          items: { type: "string" },
          description: "B案が評価された点。2〜4項目。似た意見は1項目に統合し、体言止め〜一文で簡潔に。B案支持者がいなければ空配列。",
        },
      },
      required: ["reasonsA", "reasonsB"],
    },
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const improvementSuggestionsToolSpec: any = {
  name: "suggest_improvements",
  description: "A/Bテストの評価結果から、指定されたデザイン案への改善提案を5件生成する",
  inputSchema: {
    json: {
      type: "object",
      properties: {
        designSummaryA: { type: "string", description: "評価コメントから読み取れるデザインAの見た目・構成の1行サマリー" },
        designSummaryB: { type: "string", description: "評価コメントから読み取れるデザインBの見た目・構成の1行サマリー" },
        suggestions: {
          type: "array",
          description: "改善提案。指示されたデザイン案向けに5件。",
          items: {
            type: "object",
            properties: {
              target: { type: "string", enum: ["A", "B"], description: "改善対象の案" },
              kind: { type: "string", enum: ["weakness", "transplant"], description: "weakness=対象案自身の弱点の修正 / transplant=もう一方の案の強みの移植" },
              title: { type: "string", description: "命令形の1文の提案タイトル" },
              evidence: { type: "string", description: "根拠の要約（言及ペルソナ数・タイプ、関連軸スコアなど）" },
              quote: { type: "string", description: "根拠となる評価コメントからの短い引用と発言ペルソナ名。無ければ省略。" },
              implementationPrompt: { type: "string", description: "AIツールに貼り付けて使える自己完結の実装プロンプト（## 課題（AIペルソナ評価より）/ ## 修正指示 / ## 完了条件 の3節構成）" },
            },
            required: ["target", "kind", "title", "evidence", "implementationPrompt"],
          },
        },
      },
      required: ["suggestions", "designSummaryA", "designSummaryB"],
    },
  },
};
