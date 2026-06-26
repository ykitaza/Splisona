import { personaKey } from "../shared/dynamo.js";
import { type PersonaRecord } from "../shared/types.js";

/**
 * デフォルトペルソナの定義（20体）。
 * 6つの行動タイプにバランスよく分散させた、編集・削除不可の標準ライブラリ。
 * personaId は安定した固定値（default-NN）。アバターはこの id をシードに
 * フロントエンドで決定論的に生成するため、画像アセットは持たない。
 */
type DefaultPersonaSeed = {
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
};

export const DEFAULT_PERSONAS: DefaultPersonaSeed[] = [
  // --- 行動重視型 ---
  { personaId: "default-01", displayName: "タクミ", type: "action_oriented", age: 28, gender: "男性", occupation: "ベンチャー営業", deviationScore: 55, annualIncome: 480, education: "大卒", freeText: "とにかくスピード重視。迷ったらまず試す。説明が長いUIは読まずに離脱する。" },
  { personaId: "default-02", displayName: "ケンジ", type: "action_oriented", age: 35, gender: "男性", occupation: "個人事業主", deviationScore: 52, annualIncome: 620, education: "専門卒", freeText: "意思決定が速く、CTAが明確ならすぐ行動する。回りくどい導線を嫌う。" },
  { personaId: "default-03", displayName: "ナオ", type: "action_oriented", age: 30, gender: "女性", occupation: "イベントプランナー", deviationScore: 56, annualIncome: 450, education: "大卒", freeText: "勢いと直感で動くタイプ。第一印象で『使えそう』と思えるかを重視する。" },
  { personaId: "default-04", displayName: "リョウ", type: "action_oriented", age: 24, gender: "男性", occupation: "配達ドライバー", deviationScore: 48, annualIncome: 380, education: "高卒", freeText: "スマホ片手にサッと完結させたい。タップ数が多いと一気にやる気をなくす。" },

  // --- 慎重型 ---
  { personaId: "default-05", displayName: "ヨウコ", type: "cautious", age: 48, gender: "女性", occupation: "経理担当", deviationScore: 58, annualIncome: 520, education: "短大卒", freeText: "ミスを恐れ、確認を重ねてから進める。料金や規約の表示が曖昧だと不安になる。" },
  { personaId: "default-06", displayName: "マサル", type: "cautious", age: 52, gender: "男性", occupation: "地方公務員", deviationScore: 60, annualIncome: 700, education: "大卒", freeText: "信頼性と実績を重視。新しいサービスは口コミや運営元を確認してから使う。" },
  { personaId: "default-07", displayName: "サチコ", type: "cautious", age: 61, gender: "女性", occupation: "主婦", deviationScore: 50, annualIncome: 0, education: "高卒", freeText: "操作に自信がなく、文字が小さい・専門用語が多いと手が止まる。安心感が最優先。" },

  // --- 情報感度型 ---
  { personaId: "default-08", displayName: "ソラ", type: "info_savvy", age: 23, gender: "男性", occupation: "大学院生", deviationScore: 68, annualIncome: 120, education: "大学院在学", freeText: "新技術への感度が高く、細部の作り込みやインタラクションの質に敏感に気づく。" },
  { personaId: "default-09", displayName: "ミウ", type: "info_savvy", age: 27, gender: "女性", occupation: "Webデザイナー", deviationScore: 64, annualIncome: 540, education: "専門卒", freeText: "配色・余白・タイポの一貫性を職業柄チェックする。雑な作りはすぐ見抜く。" },
  { personaId: "default-10", displayName: "カイト", type: "info_savvy", age: 19, gender: "男性", occupation: "専門学校生", deviationScore: 59, annualIncome: 80, education: "専門学校在学", freeText: "SNSで常に情報収集するデジタルネイティブ。トレンドの機能を比較して評価する。" },

  // --- 効率主義型 ---
  { personaId: "default-11", displayName: "アキラ", type: "efficiency", age: 41, gender: "男性", occupation: "ITマネージャー", deviationScore: 66, annualIncome: 850, education: "大卒", freeText: "ROIと工数で判断する。無駄なステップや装飾は即スキップしたい合理主義者。" },
  { personaId: "default-12", displayName: "レイ", type: "efficiency", age: 38, gender: "女性", occupation: "経営コンサルタント", deviationScore: 70, annualIncome: 1100, education: "大学院卒", freeText: "最短で目的を達成できるかを重視。情報設計の優先順位が悪いと評価を下げる。" },
  { personaId: "default-13", displayName: "ジュン", type: "efficiency", age: 45, gender: "男性", occupation: "工場長", deviationScore: 54, annualIncome: 680, education: "高卒", freeText: "現場主義で実用性を最重視。見た目より『手数が少なく確実に終わるか』を見る。" },

  // --- コスパ重視型 ---
  { personaId: "default-14", displayName: "ユカ", type: "cost_conscious", age: 34, gender: "女性", occupation: "パート", deviationScore: 49, annualIncome: 130, education: "高卒", freeText: "価格とレビューを徹底比較してから決める。割引や送料の表示に強く反応する。" },
  { personaId: "default-15", displayName: "ダイチ", type: "cost_conscious", age: 29, gender: "男性", occupation: "会社員", deviationScore: 53, annualIncome: 430, education: "大卒", freeText: "コスパ命。同等なら必ず安い方を選び、隠れコストがないかを警戒する。" },
  { personaId: "default-16", displayName: "ノブ", type: "cost_conscious", age: 56, gender: "男性", occupation: "自営業", deviationScore: 51, annualIncome: 560, education: "高卒", freeText: "長く使えてお得かを重視。無料お試しや解約のしやすさを必ず確認する。" },
  { personaId: "default-17", displayName: "ミキ", type: "cost_conscious", age: 23, gender: "女性", occupation: "新社会人", deviationScore: 50, annualIncome: 320, education: "大卒", freeText: "節約志向で、ポイント還元やキャンペーンの有無で利用を判断する。" },

  // --- トレンド敏感型 ---
  { personaId: "default-18", displayName: "アオイ", type: "trend_sensitive", age: 20, gender: "女性", occupation: "大学生", deviationScore: 57, annualIncome: 60, education: "大学在学", freeText: "おしゃれで今っぽいデザインに強く惹かれる。SNS映えと世界観の統一感を重視。" },
  { personaId: "default-19", displayName: "ハナ", type: "trend_sensitive", age: 25, gender: "女性", occupation: "アパレル店員", deviationScore: 52, annualIncome: 300, education: "専門卒", freeText: "ビジュアルの第一印象がすべて。流行の配色やフォントに敏感に反応する。" },
  { personaId: "default-20", displayName: "シュン", type: "trend_sensitive", age: 21, gender: "男性", occupation: "クリエイター志望", deviationScore: 58, annualIncome: 150, education: "専門学校在学", freeText: "話題性と新しさを重視。既視感のあるデザインには冷めやすく、独自性を評価する。" },
];

/** デフォルトペルソナを DynamoDB レコードへ変換する */
export function buildDefaultPersonaRecords(userId: string, now: string): PersonaRecord[] {
  return DEFAULT_PERSONAS.map((p) => ({
    ...personaKey(userId, p.personaId),
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
