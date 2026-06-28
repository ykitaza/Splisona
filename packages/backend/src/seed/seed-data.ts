import type { ABTest, Evaluation, EvaluationScores } from "../domain/types.js";

const SEED_USER = "local-user";
const NOW = "2026-06-28T10:00:00.000Z";

// ---------------------------------------------------------------------------
// テスト1: B圧勝 (5-1)  — "AURORA LP比較: ミニマル vs ボールド"
// ---------------------------------------------------------------------------
export const test1: ABTest = {
  testId: "seed-test-01",
  userId: SEED_USER,
  title: "AURORA LP比較: ミニマル vs ボールド",
  status: "completed",
  designAInputType: "image_upload",
  designBInputType: "image_upload",
  designAImageKey: `${SEED_USER}/seed-test-01/A.png`,
  designBImageKey: `${SEED_USER}/seed-test-01/B.png`,
  personaIds: ["default-01", "default-05", "default-08", "default-11", "default-14", "default-18"],
  reasonSummaryStatus: "ready",
  reasonSummaryA: [
    "情報が整理されていて読みやすく、信頼感がある",
  ],
  reasonSummaryB: [
    "CTAが目立ち、行動を起こしやすい",
    "ダークUIが先進的で印象に残る",
    "AI機能のバッジが差別化ポイントとして効いている",
    "視覚的なインパクトが強く、ブランドの世界観が伝わる",
  ],
  winnersReasonSummary: "CTAが目立ち、行動を起こしやすい、ダークUIが先進的で印象に残る、AI機能のバッジが差別化ポイントとして効いている、視覚的なインパクトが強く、ブランドの世界観が伝わる",
  createdAt: NOW,
  updatedAt: NOW,
};

function scores(u: number, a: number, c: number, e: number, t: number): EvaluationScores {
  return { usability: u, aesthetics: a, clarity: c, engagement: e, trust: t };
}

export const evals1: Evaluation[] = [
  {
    testId: "seed-test-01",
    personaId: "default-01", // タクミ (行動重視)
    personaDisplayName: "タクミ",
    winner: "B",
    confidence: 0.9,
    reason: "CTAボタンがでかくて目立つ。Bの方がパッと見で何をすべきかわかる。Aは余白が多くてスクロールしないとCTAに辿り着けない。",
    scoresA: scores(6, 7, 7, 5, 7),
    scoresB: scores(8, 8, 7, 9, 7),
    status: "completed",
    evaluatedAt: NOW,
  },
  {
    testId: "seed-test-01",
    personaId: "default-05", // ヨウコ (慎重型)
    personaDisplayName: "ヨウコ",
    winner: "A",
    confidence: 0.7,
    reason: "白背景の方が文字が読みやすく、情報がきちんと整理されている印象。ダークテーマは目が疲れそうで、長時間比較検討するには不向き。",
    scoresA: scores(8, 6, 9, 5, 9),
    scoresB: scores(6, 7, 6, 7, 6),
    status: "completed",
    evaluatedAt: NOW,
  },
  {
    testId: "seed-test-01",
    personaId: "default-08", // ソラ (情報感度型)
    personaDisplayName: "ソラ",
    winner: "B",
    confidence: 0.85,
    reason: "AI機能のバッジやグラデーションの使い方がモダン。プロダクトスクリーンショットのフレームもダークUIと調和していて、技術力を感じる。",
    scoresA: scores(7, 6, 8, 5, 7),
    scoresB: scores(7, 9, 7, 9, 7),
    status: "completed",
    evaluatedAt: NOW,
  },
  {
    testId: "seed-test-01",
    personaId: "default-11", // アキラ (効率主義)
    personaDisplayName: "アキラ",
    winner: "B",
    confidence: 0.75,
    reason: "ヘッダーにCTAが配置されていて、スクロール不要で次のアクションに移れる。AはナビがテキストリンクのみでCTAが弱い。",
    scoresA: scores(7, 7, 8, 5, 8),
    scoresB: scores(8, 7, 7, 8, 7),
    status: "completed",
    evaluatedAt: NOW,
  },
  {
    testId: "seed-test-01",
    personaId: "default-14", // ユカ (コスパ重視)
    personaDisplayName: "ユカ",
    winner: "B",
    confidence: 0.65,
    reason: "「14日間無料トライアル」の文言がボタンに直接書いてあるのが良い。Aの「無料で始める」は具体性に欠ける。",
    scoresA: scores(7, 6, 7, 5, 7),
    scoresB: scores(7, 7, 7, 7, 7),
    status: "completed",
    evaluatedAt: NOW,
  },
  {
    testId: "seed-test-01",
    personaId: "default-18", // アオイ (トレンド敏感)
    personaDisplayName: "アオイ",
    winner: "B",
    confidence: 0.95,
    reason: "圧倒的にBがおしゃれ。グラデーションのロゴ、ダークUI、パープル系のアクセントカラーが今っぽい。AはSaaS感が強くて既視感がある。",
    scoresA: scores(7, 5, 7, 4, 7),
    scoresB: scores(7, 10, 6, 10, 6),
    status: "completed",
    evaluatedAt: NOW,
  },
];

// ---------------------------------------------------------------------------
// テスト2: 引き分け (3-3)  — "AURORA LP比較: 情報量 vs インパクト"
// ---------------------------------------------------------------------------
export const test2: ABTest = {
  testId: "seed-test-02",
  userId: SEED_USER,
  title: "AURORA LP比較: 情報量 vs インパクト",
  status: "completed",
  designAInputType: "image_upload",
  designBInputType: "image_upload",
  designAImageKey: `${SEED_USER}/seed-test-02/A.png`,
  designBImageKey: `${SEED_USER}/seed-test-02/B.png`,
  personaIds: ["default-03", "default-06", "default-09", "default-12", "default-16", "default-20"],
  reasonSummaryStatus: "ready",
  reasonSummaryA: [
    "情報設計が明快で、判断に必要な材料が揃っている",
    "実績数値の提示が信頼感につながる",
    "ユーザビリティと可読性に優れる",
  ],
  reasonSummaryB: [
    "ビジュアルのインパクトが強く、差別化を感じる",
    "AIバッジやグラデーションなど細部の作り込みが良い",
    "世界観の統一感がブランディングに効いている",
  ],
  winnersReasonSummary: "",
  createdAt: NOW,
  updatedAt: NOW,
};

export const evals2: Evaluation[] = [
  {
    testId: "seed-test-02",
    personaId: "default-03", // ナオ (行動重視)
    personaDisplayName: "ナオ",
    winner: "B",
    confidence: 0.8,
    reason: "第一印象でBの方が「使ってみたい」と思った。ダークで目を引くし、トライアルボタンもわかりやすい。",
    scoresA: scores(7, 6, 7, 6, 7),
    scoresB: scores(7, 9, 7, 9, 6),
    status: "completed",
    evaluatedAt: NOW,
  },
  {
    testId: "seed-test-02",
    personaId: "default-06", // マサル (慎重型)
    personaDisplayName: "マサル",
    winner: "A",
    confidence: 0.8,
    reason: "12,000+チーム、99.9% Uptimeなどの実績数値が掲載されている点が決め手。Bには具体的な裏付けがなく、派手なだけに見える。",
    scoresA: scores(8, 6, 9, 5, 9),
    scoresB: scores(6, 8, 6, 7, 5),
    status: "completed",
    evaluatedAt: NOW,
  },
  {
    testId: "seed-test-02",
    personaId: "default-09", // ミウ (情報感度・デザイナー)
    personaDisplayName: "ミウ",
    winner: "B",
    confidence: 0.7,
    reason: "タイポグラフィの階層設計、カラーパレットの統一感、余白の使い方がBの方がプロフェッショナル。ただしAの可読性も悪くない。",
    scoresA: scores(7, 7, 8, 5, 7),
    scoresB: scores(7, 9, 7, 8, 7),
    status: "completed",
    evaluatedAt: NOW,
  },
  {
    testId: "seed-test-02",
    personaId: "default-12", // レイ (効率主義・コンサル)
    personaDisplayName: "レイ",
    winner: "A",
    confidence: 0.75,
    reason: "情報の優先順位が明確で、3カラムのフィーチャー比較が一覧しやすい。Bは見栄えは良いが、スクロールしないと全体像が掴めない。",
    scoresA: scores(9, 6, 9, 5, 8),
    scoresB: scores(7, 8, 6, 8, 6),
    status: "completed",
    evaluatedAt: NOW,
  },
  {
    testId: "seed-test-02",
    personaId: "default-16", // ノブ (コスパ重視)
    personaDisplayName: "ノブ",
    winner: "A",
    confidence: 0.6,
    reason: "シンプルで余計な装飾がない分、中身に集中できる。Bは格好いいけど、結局何がいくらなのかがすぐにわからない。",
    scoresA: scores(8, 5, 8, 5, 8),
    scoresB: scores(6, 7, 6, 7, 6),
    status: "completed",
    evaluatedAt: NOW,
  },
  {
    testId: "seed-test-02",
    personaId: "default-20", // シュン (トレンド敏感)
    personaDisplayName: "シュン",
    winner: "B",
    confidence: 0.9,
    reason: "Bは独自の世界観があって、他のSaaSサイトと差別化できている。Aは既視感が強い。SNSでシェアするならBを選ぶ。",
    scoresA: scores(6, 5, 7, 4, 7),
    scoresB: scores(6, 10, 6, 10, 6),
    status: "completed",
    evaluatedAt: NOW,
  },
];
