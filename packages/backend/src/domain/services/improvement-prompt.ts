import type { Evaluation, EvaluationScores } from "../types.js";

const AXIS_LABELS: Record<keyof EvaluationScores, string> = {
  usability: "使いやすさ",
  aesthetics: "見た目",
  clarity: "明確さ",
  engagement: "訴求力",
  trust: "信頼感",
};

function axisAverages(completed: Evaluation[], side: "A" | "B"): string {
  const keys = Object.keys(AXIS_LABELS) as (keyof EvaluationScores)[];
  return keys
    .map((k) => {
      const avg = completed.reduce((s, e) => s + (side === "A" ? e.scoresA[k] : e.scoresB[k]), 0) / completed.length;
      return `${AXIS_LABELS[k]} ${Math.round(avg)}`;
    })
    .join(" / ");
}

/**
 * 改善提案生成のためのユーザープロンプトを組み立てる。
 * 入力はテキストのみ（画像は使わない）。
 */
export function buildImprovementRequestText(completed: Evaluation[], focusPoints: string | undefined, target: "A" | "B"): string {
  const countA = completed.filter((e) => e.winner === "A").length;
  const countB = completed.filter((e) => e.winner === "B").length;
  const winner = countA === countB ? "引き分け" : countA > countB ? "A" : "B";
  const other = target === "A" ? "B" : "A";

  return [
    `デザイン A/B テストの結果です。支持: A ${countA}人 / B ${countB}人（勝者: ${winner}）`,
    `各軸スコア平均（0〜100） A案: ${axisAverages(completed, "A")}`,
    `各軸スコア平均（0〜100） B案: ${axisAverages(completed, "B")}`,
    focusPoints ? `テストの注目ポイント: ${focusPoints}` : null,
    "",
    "ペルソナごとの評価コメント:",
    ...completed.map((e) => `- ${e.personaDisplayName}（${e.winner === "none" ? "引分" : e.winner + "案支持"}, 確信度${e.confidence}%）: ${e.reason}`),
    "",
    `上記の評価だけを根拠に、デザイン${target}に対する改善提案を5件生成してください。`,
    "ルール:",
    `- 提案の対象はデザイン${target}のみ。target フィールドは必ず "${target}" とすること`,
    "- 提案は評価コメントか軸スコアに実際に現れた指摘のみから導出すること（一般論の追加は禁止）",
    `- kind は、デザイン${target}自身への指摘に基づくものは weakness、デザイン${other}の優れていた点を${target}に取り込む提案は transplant とする`,
    "- evidence には根拠を簡潔に（言及したペルソナ数・タイプ、関連する軸スコア）。コメントの原文引用は含めず要約のみとする（原文は quote に入れる）",
    "- quote には根拠となる評価コメントからの短い引用と発言ペルソナ名（適切なものが無ければ省略可）",
    "- implementationPrompt は「## 課題」「## 修正指示」「## 完了条件」の3節構成の日本語プロンプトとする。テスト概要・評価方法・スコアの意味はアプリ側が先頭に自動付与するため説明不要。ただし、どのデザイン（A/B）を修正するのかは修正指示の冒頭で明示すること",
    "- title は命令形の1文で簡潔に",
    "- designSummaryA / designSummaryB には、評価コメントから読み取れる各デザインの見た目・構成の特徴を1行で要約すること（例:「赤基調で情報量の多い縦長LP」）",
  ].filter((l) => l !== null).join("\n");
}

export const improvementSuggestionsSchema = {
  type: "object",
  properties: {
    designSummaryA: { type: "string" },
    designSummaryB: { type: "string" },
    suggestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          target: { type: "string", enum: ["A", "B"] },
          kind: { type: "string", enum: ["weakness", "transplant"] },
          title: { type: "string" },
          evidence: { type: "string" },
          quote: { type: "string" },
          implementationPrompt: { type: "string" },
        },
        required: ["target", "kind", "title", "evidence", "implementationPrompt"],
      },
    },
  },
  required: ["suggestions", "designSummaryA", "designSummaryB"],
} as const;
