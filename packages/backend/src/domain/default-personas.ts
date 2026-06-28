import type { Persona } from "./types.js";

interface DefaultPersonaSeed {
  personaId: string;
  displayName: string;
  type: string;
  age: number;
  gender: string;
  occupation: string;
  deviationScore: number;
  annualIncome: number;
  education: string;
  freeText: string;
}

export const DEFAULT_PERSONAS: DefaultPersonaSeed[] = [
  // --- 行動重視型 ---
  { personaId: "default-01", displayName: "タクミ", type: "action_oriented", age: 28, gender: "男性", occupation: "ベンチャー営業", deviationScore: 55, annualIncome: 480, education: "大卒", freeText: "とにかくスピード重視。迷ったらまず試す。説明が長いUIは読まずに離脱する。" },
  { personaId: "default-02", displayName: "ナオ", type: "action_oriented", age: 30, gender: "女性", occupation: "イベントプランナー", deviationScore: 56, annualIncome: 450, education: "大卒", freeText: "勢いと直感で動くタイプ。第一印象で『使えそう』と思えるかを重視する。" },

  // --- 慎重型 ---
  { personaId: "default-03", displayName: "ヨウコ", type: "cautious", age: 48, gender: "女性", occupation: "経理担当", deviationScore: 58, annualIncome: 520, education: "短大卒", freeText: "ミスを恐れ、確認を重ねてから進める。料金や規約の表示が曖昧だと不安になる。" },
  { personaId: "default-04", displayName: "マサル", type: "cautious", age: 52, gender: "男性", occupation: "地方公務員", deviationScore: 60, annualIncome: 700, education: "大卒", freeText: "信頼性と実績を重視。新しいサービスは口コミや運営元を確認してから使う。" },

  // --- 情報感度型 ---
  { personaId: "default-05", displayName: "ソラ", type: "info_savvy", age: 23, gender: "男性", occupation: "大学院生", deviationScore: 68, annualIncome: 120, education: "大学院在学", freeText: "新技術への感度が高く、細部の作り込みやインタラクションの質に敏感に気づく。" },
  { personaId: "default-06", displayName: "ミウ", type: "info_savvy", age: 27, gender: "女性", occupation: "Webデザイナー", deviationScore: 64, annualIncome: 540, education: "専門卒", freeText: "配色・余白・タイポの一貫性を職業柄チェックする。雑な作りはすぐ見抜く。" },

  // --- 効率主義型 ---
  { personaId: "default-07", displayName: "アキラ", type: "efficiency", age: 41, gender: "男性", occupation: "ITマネージャー", deviationScore: 66, annualIncome: 850, education: "大卒", freeText: "ROIと工数で判断する。無駄なステップや装飾は即スキップしたい合理主義者。" },
  { personaId: "default-08", displayName: "レイ", type: "efficiency", age: 38, gender: "女性", occupation: "経営コンサルタント", deviationScore: 70, annualIncome: 1100, education: "大学院卒", freeText: "最短で目的を達成できるかを重視。情報設計の優先順位が悪いと評価を下げる。" },

  // --- コスパ重視型 ---
  { personaId: "default-09", displayName: "ユカ", type: "cost_conscious", age: 34, gender: "女性", occupation: "パート", deviationScore: 49, annualIncome: 130, education: "高卒", freeText: "価格とレビューを徹底比較してから決める。割引や送料の表示に強く反応する。" },
  { personaId: "default-10", displayName: "ダイチ", type: "cost_conscious", age: 29, gender: "男性", occupation: "会社員", deviationScore: 53, annualIncome: 430, education: "大卒", freeText: "コスパ命。同等なら必ず安い方を選び、隠れコストがないかを警戒する。" },

  // --- トレンド敏感型 ---
  { personaId: "default-11", displayName: "アオイ", type: "trend_sensitive", age: 20, gender: "女性", occupation: "大学生", deviationScore: 57, annualIncome: 60, education: "大学在学", freeText: "おしゃれで今っぽいデザインに強く惹かれる。SNS映えと世界観の統一感を重視。" },
  { personaId: "default-12", displayName: "シュン", type: "trend_sensitive", age: 21, gender: "男性", occupation: "クリエイター志望", deviationScore: 58, annualIncome: 150, education: "専門学校在学", freeText: "話題性と新しさを重視。既視感のあるデザインには冷めやすく、独自性を評価する。" },
];

export function buildDefaultPersonas(userId: string, now: string): Persona[] {
  return DEFAULT_PERSONAS.map((p) => ({
    personaId: p.personaId,
    userId,
    displayName: p.displayName,
    type: p.type,
    source: "default" as const,
    age: p.age,
    gender: p.gender,
    occupation: p.occupation,
    deviationScore: p.deviationScore,
    annualIncome: p.annualIncome,
    education: p.education,
    freeText: p.freeText,
    createdAt: now,
    updatedAt: now,
  }));
}
