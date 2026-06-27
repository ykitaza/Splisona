import type { AIService, ConversationMessage, EvaluateDesignsParams, ImageSource } from "../../domain/ports/ai-service.js";
import type { DraftResult, EvaluationInput, ReasonSummary } from "../../domain/types.js";

export class StubAIService implements AIService {
  async generateDraft(personaName: string, _attributes: string): Promise<DraftResult> {
    return {
      freeText: `[ローカルスタブ] ${personaName}は日常的にデジタルサービスを利用しており、使いやすさと視覚的な明確さを重視する傾向があります。`,
      suggestedDescription: `[ローカルスタブ] ${personaName}の行動特性と価値観に関する説明文がここに生成されます。`,
    };
  }

  async chat(_systemPrompt: string, _messages: ConversationMessage[]): Promise<string> {
    return "[ローカルスタブ] ローカル開発モードのため、実際のAI応答は生成されません。";
  }

  async evaluateDesigns(params: EvaluateDesignsParams): Promise<EvaluationInput> {
    const winner = Math.random() > 0.5 ? "A" : "B";
    const scoreFor = (isWinner: boolean) => {
      const base = isWinner ? 70 : 45;
      const r = () => base + Math.floor(Math.random() * 25);
      return { usability: r(), aesthetics: r(), clarity: r(), engagement: r(), trust: r() };
    };
    return {
      winner: winner as "A" | "B",
      confidence: Math.floor(Math.random() * 35) + 60,
      reason: `[ローカルスタブ] ${params.persona.displayName}視点での評価。デザイン${winner}の方が視認性・操作性に優れていると判断しました。`,
      scoresA: scoreFor(winner === "A"),
      scoresB: scoreFor(winner === "B"),
    };
  }

  async summarizeReasons(_reasonsText: string): Promise<ReasonSummary> {
    return { reasonsA: ["[スタブ] A案の理由"], reasonsB: ["[スタブ] B案の理由"] };
  }

  async generateTitle(_imageA: ImageSource, _imageB: ImageSource): Promise<string> {
    return `A/B テスト ${new Date().toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}`;
  }
}
