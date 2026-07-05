import { SEGMENT_OVERLAP } from "@chorus/shared";
import type { AIService, ConversationMessage, EvaluateDesignsParams, ImageSource } from "../../domain/ports/ai-service.js";
import type { DraftResult, EvaluationInput, ImprovementReport, ImprovementSuggestion, ReasonSummary } from "../../domain/types.js";
import { buildEvaluationPrompt } from "../../domain/services/evaluation-prompt.js";

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
      resolvedPrompt: buildEvaluationPrompt({
        persona: params.persona,
        projectContext: params.projectContext,
        focusPoints: params.focusPoints,
        additionalInstruction: params.additionalInstruction,
        evaluateInstruction: "あなたのペルソナ視点から評価してください。",
        segmentation: { countA: params.imagesA.length, countB: params.imagesB.length, overlapPx: SEGMENT_OVERLAP },
      }),
    };
  }

  async summarizeReasons(_reasonsText: string): Promise<ReasonSummary> {
    return { reasonsA: ["[スタブ] A案の理由"], reasonsB: ["[スタブ] B案の理由"] };
  }

  async generateImprovementSuggestions(_requestText: string): Promise<ImprovementReport> {
    const prompt = (target: string, title: string) =>
      `あなたはLPの改善を行います。対象はデザイン${target}です。\n\n## 課題（AIペルソナ評価より）\n[ローカルスタブ] 複数ペルソナが課題を指摘しました。\n\n## 修正指示\n${title}\n\n## 完了条件\n再テストで該当軸のスコアが改善していること。`;
    const item = (target: "A" | "B", kind: "weakness" | "transplant", no: number): ImprovementSuggestion => ({
      target,
      kind,
      title: `[スタブ] ${target}案の改善提案 ${no}`,
      evidence: `${target === "A" ? "A" : "B"} の${kind === "weakness" ? "弱点" : "強み移植"} · ペルソナ2人が言及 · 分かりやすさ 62/100`,
      quote: no === 1 ? `「[スタブ] 導線が分かりにくかった」— タクミ（行動重視型）` : undefined,
      implementationPrompt: prompt(target, `[スタブ] ${target}案の改善提案 ${no} を実装する`),
    });
    return {
      designSummaryA: "[スタブ] 赤基調で情報量の多い縦長LP",
      designSummaryB: "[スタブ] 青基調でシンプルな構成のLP",
      suggestions: [item("A", "weakness", 1), item("A", "weakness", 2), item("A", "transplant", 3),
                    item("B", "weakness", 1), item("B", "transplant", 2), item("B", "weakness", 3)],
    };
  }

  async generateTitle(_imageA: ImageSource, _imageB: ImageSource): Promise<string> {
    return `A/B テスト ${new Date().toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}`;
  }
}
