import type { ABTest, Evaluation, EvaluationScores } from "../domain/types.js";

const NOW = "2026-06-01T10:00:00.000Z";

function buildTest1(userId: string): ABTest {
  return {
  testId: "seed-test-01",
  userId,
  title: "[サンプル] AURORA LP比較: ミニマル vs ボールド",
  status: "completed",
  designAInputType: "image_upload",
  designBInputType: "image_upload",
  designAImageKey: `${userId}/seed-test-01/A.png`,
  designBImageKey: `${userId}/seed-test-01/B.png`,
  personaIds: ["default-01","default-02","default-03","default-04","default-05","default-06","default-07","default-08","default-09","default-10","default-11","default-12"],
  reasonSummaryStatus: "ready",
  reasonSummaryA: [
    "情報が整理されていて読みやすく、信頼感がある",
    "料金や実績の根拠が明示されていて安心できる",
  ],
  reasonSummaryB: [
    "CTAが目立ち、行動を起こしやすい",
    "ダークUIが先進的で印象に残る",
    "AI機能のバッジが差別化ポイントとして効いている",
    "視覚的なインパクトが強く、ブランドの世界観が伝わる",
  ],
  winnersReasonSummary: "CTAが目立ち行動を起こしやすい、ダークUIが先進的で印象に残る、AI機能のバッジが差別化ポイントとして効いている、視覚的インパクトが強くブランドの世界観が伝わる",
  createdAt: NOW,
  updatedAt: NOW,
  };
}

function scores(u: number, a: number, c: number, e: number, t: number): EvaluationScores {
  return { usability: u, aesthetics: a, clarity: c, engagement: e, trust: t };
}

const evals1: Evaluation[] = [
  { testId: "seed-test-01", personaId: "default-01", personaDisplayName: "タクミ", winner: "B", confidence: 0.9, reason: "CTAボタンがでかくて目立つ。Bの方がパッと見で何をすべきかわかる。Aは余白が多くてスクロールしないとCTAに辿り着けない。", scoresA: scores(60, 70, 70, 50, 70), scoresB: scores(80, 80, 70, 90, 70), status: "completed", evaluatedAt: NOW },
  { testId: "seed-test-01", personaId: "default-02", personaDisplayName: "ナオ", winner: "B", confidence: 0.8, reason: "第一印象でBの方が「使ってみたい」と思った。ダークで目を引くし、トライアルボタンもわかりやすい。", scoresA: scores(70, 60, 70, 60, 70), scoresB: scores(70, 90, 70, 90, 60), status: "completed", evaluatedAt: NOW },
  { testId: "seed-test-01", personaId: "default-03", personaDisplayName: "ヨウコ", winner: "A", confidence: 0.7, reason: "白背景の方が文字が読みやすく、情報がきちんと整理されている印象。ダークテーマは目が疲れそうで、長時間比較検討するには不向き。", scoresA: scores(80, 60, 90, 50, 90), scoresB: scores(60, 70, 60, 70, 60), status: "completed", evaluatedAt: NOW },
  { testId: "seed-test-01", personaId: "default-04", personaDisplayName: "マサル", winner: "A", confidence: 0.75, reason: "12,000+チーム、99.9% Uptimeなどの実績数値が掲載されている点が決め手。Bには具体的な裏付けがなく、派手なだけに見える。", scoresA: scores(80, 60, 90, 50, 90), scoresB: scores(60, 80, 60, 70, 50), status: "completed", evaluatedAt: NOW },
  { testId: "seed-test-01", personaId: "default-05", personaDisplayName: "ソラ", winner: "B", confidence: 0.85, reason: "AI機能のバッジやグラデーションの使い方がモダン。プロダクトスクリーンショットのフレームもダークUIと調和していて、技術力を感じる。", scoresA: scores(70, 60, 80, 50, 70), scoresB: scores(70, 90, 70, 90, 70), status: "completed", evaluatedAt: NOW },
  { testId: "seed-test-01", personaId: "default-06", personaDisplayName: "ミウ", winner: "B", confidence: 0.7, reason: "タイポグラフィの階層設計、カラーパレットの統一感、余白の使い方がBの方がプロフェッショナル。ただしAの可読性も悪くない。", scoresA: scores(70, 70, 80, 50, 70), scoresB: scores(70, 90, 70, 80, 70), status: "completed", evaluatedAt: NOW },
  { testId: "seed-test-01", personaId: "default-07", personaDisplayName: "アキラ", winner: "B", confidence: 0.75, reason: "ヘッダーにCTAが配置されていて、スクロール不要で次のアクションに移れる。AはナビがテキストリンクのみでCTAが弱い。", scoresA: scores(70, 70, 80, 50, 80), scoresB: scores(80, 70, 70, 80, 70), status: "completed", evaluatedAt: NOW },
  { testId: "seed-test-01", personaId: "default-08", personaDisplayName: "レイ", winner: "A", confidence: 0.75, reason: "情報の優先順位が明確で、3カラムのフィーチャー比較が一覧しやすい。Bは見栄えは良いが、スクロールしないと全体像が掴めない。", scoresA: scores(90, 60, 90, 50, 80), scoresB: scores(70, 80, 60, 80, 60), status: "completed", evaluatedAt: NOW },
  { testId: "seed-test-01", personaId: "default-09", personaDisplayName: "ユカ", winner: "B", confidence: 0.65, reason: "「14日間無料トライアル」の文言がボタンに直接書いてあるのが良い。Aの「無料で始める」は具体性に欠ける。", scoresA: scores(70, 60, 70, 50, 70), scoresB: scores(70, 70, 70, 70, 70), status: "completed", evaluatedAt: NOW },
  { testId: "seed-test-01", personaId: "default-10", personaDisplayName: "ダイチ", winner: "B", confidence: 0.6, reason: "無料トライアルの訴求が明確で、コスト面の不安なく試せる印象。Aは料金ページへの導線がわかりにくい。", scoresA: scores(70, 55, 75, 50, 75), scoresB: scores(70, 65, 70, 65, 70), status: "completed", evaluatedAt: NOW },
  { testId: "seed-test-01", personaId: "default-11", personaDisplayName: "アオイ", winner: "B", confidence: 0.95, reason: "圧倒的にBがおしゃれ。グラデーションのロゴ、ダークUI、パープル系のアクセントカラーが今っぽい。AはSaaS感が強くて既視感がある。", scoresA: scores(70, 50, 70, 40, 70), scoresB: scores(70, 100, 60, 100, 60), status: "completed", evaluatedAt: NOW },
  { testId: "seed-test-01", personaId: "default-12", personaDisplayName: "シュン", winner: "B", confidence: 0.9, reason: "Bは独自の世界観があって、他のSaaSサイトと差別化できている。Aは既視感が強い。SNSでシェアするならBを選ぶ。", scoresA: scores(60, 50, 70, 40, 70), scoresB: scores(60, 100, 60, 100, 60), status: "completed", evaluatedAt: NOW },
];

function buildTest2(userId: string): ABTest {
  return {
  testId: "seed-test-02",
  userId,
  title: "[サンプル] AURORA LP比較: 情報量 vs インパクト",
  status: "completed",
  designAInputType: "image_upload",
  designBInputType: "image_upload",
  designAImageKey: `${userId}/seed-test-02/A.png`,
  designBImageKey: `${userId}/seed-test-02/B.png`,
  personaIds: ["default-01","default-02","default-03","default-04","default-05","default-06","default-07","default-08","default-09","default-10","default-11","default-12"],
  reasonSummaryStatus: "ready",
  reasonSummaryA: [
    "情報設計が明快で、判断に必要な材料が揃っている",
    "実績数値の提示が信頼感につながる",
    "ユーザビリティと可読性に優れる",
    "料金体系が一目でわかる",
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
}

const evals2: Evaluation[] = [
  { testId: "seed-test-02", personaId: "default-01", personaDisplayName: "タクミ", winner: "B", confidence: 0.8, reason: "Bの方がCTAまでのステップが少なく、パッと見で行動できる。Aは読ませようとする構成が多い。", scoresA: scores(65, 60, 70, 55, 70), scoresB: scores(75, 85, 65, 85, 60), status: "completed", evaluatedAt: NOW },
  { testId: "seed-test-02", personaId: "default-02", personaDisplayName: "ナオ", winner: "A", confidence: 0.65, reason: "情報量が多い方が安心できる。Bはおしゃれだけど中身が薄い印象。", scoresA: scores(75, 60, 80, 55, 80), scoresB: scores(65, 80, 60, 75, 55), status: "completed", evaluatedAt: NOW },
  { testId: "seed-test-02", personaId: "default-03", personaDisplayName: "ヨウコ", winner: "A", confidence: 0.85, reason: "料金表が一目で比較でき、導入実績の数字も明示されている。Bは華やかだが肝心の根拠が弱い。", scoresA: scores(85, 55, 90, 45, 90), scoresB: scores(60, 75, 55, 70, 55), status: "completed", evaluatedAt: NOW },
  { testId: "seed-test-02", personaId: "default-04", personaDisplayName: "マサル", winner: "A", confidence: 0.8, reason: "運営元の情報、セキュリティ認証マークが見つけやすい。Bはビジュアル優先で信頼性の根拠が奥にある。", scoresA: scores(80, 55, 85, 50, 90), scoresB: scores(65, 80, 60, 70, 55), status: "completed", evaluatedAt: NOW },
  { testId: "seed-test-02", personaId: "default-05", personaDisplayName: "ソラ", winner: "B", confidence: 0.75, reason: "インタラクションのマイクロアニメーションが丁寧。技術スタックの記載もあり、エンジニア視点で好印象。", scoresA: scores(70, 65, 75, 55, 70), scoresB: scores(75, 90, 70, 85, 70), status: "completed", evaluatedAt: NOW },
  { testId: "seed-test-02", personaId: "default-06", personaDisplayName: "ミウ", winner: "B", confidence: 0.7, reason: "グリッドシステムの一貫性、色の抑制、タイポの階層がBの方が洗練されている。Aは普通に良いが記憶に残らない。", scoresA: scores(70, 70, 80, 50, 70), scoresB: scores(70, 90, 70, 80, 70), status: "completed", evaluatedAt: NOW },
  { testId: "seed-test-02", personaId: "default-07", personaDisplayName: "アキラ", winner: "A", confidence: 0.7, reason: "3カラムの機能比較表がダッシュボード選定時に必要な情報をカバーしている。Bはスクロール量が多い。", scoresA: scores(85, 60, 85, 50, 80), scoresB: scores(70, 75, 65, 75, 65), status: "completed", evaluatedAt: NOW },
  { testId: "seed-test-02", personaId: "default-08", personaDisplayName: "レイ", winner: "A", confidence: 0.8, reason: "ファーストビューで価値提案→機能→料金→CTAの導線が教科書的に整っている。Bは世界観先行で情報密度が低い。", scoresA: scores(90, 60, 90, 50, 85), scoresB: scores(70, 80, 60, 80, 60), status: "completed", evaluatedAt: NOW },
  { testId: "seed-test-02", personaId: "default-09", personaDisplayName: "ユカ", winner: "A", confidence: 0.7, reason: "料金プランの比較表が見やすく、「月額いくらで何ができるか」が即座にわかる。Bは価格が見つけにくい。", scoresA: scores(80, 50, 85, 50, 80), scoresB: scores(60, 70, 55, 65, 55), status: "completed", evaluatedAt: NOW },
  { testId: "seed-test-02", personaId: "default-10", personaDisplayName: "ダイチ", winner: "A", confidence: 0.6, reason: "シンプルで余計な装飾がない分、中身に集中できる。Bは格好いいけど結局何がいくらなのかがすぐわからない。", scoresA: scores(80, 50, 80, 50, 80), scoresB: scores(60, 70, 60, 70, 60), status: "completed", evaluatedAt: NOW },
  { testId: "seed-test-02", personaId: "default-11", personaDisplayName: "アオイ", winner: "B", confidence: 0.9, reason: "Bの方がブランドとしての存在感がある。SNSで紹介するときに「このサービスかっこいい」と言える。", scoresA: scores(65, 50, 65, 45, 65), scoresB: scores(65, 95, 60, 95, 60), status: "completed", evaluatedAt: NOW },
  { testId: "seed-test-02", personaId: "default-12", personaDisplayName: "シュン", winner: "B", confidence: 0.85, reason: "独自のビジュアル言語を持っていて、他と差別化できている。Aは量産型SaaSサイトの域を出ない。", scoresA: scores(60, 50, 70, 40, 70), scoresB: scores(60, 95, 60, 95, 60), status: "completed", evaluatedAt: NOW },
];

export function buildSeedData(userId: string): { tests: ABTest[]; evaluations: Evaluation[] } {
  return {
    tests: [buildTest1(userId), buildTest2(userId)],
    evaluations: [...evals1, ...evals2],
  };
}

export function SEED_IMAGE_KEYS(userId: string) {
  return [
    { src: "_seed/seed-test-01/A.png", dest: `${userId}/seed-test-01/A.png` },
    { src: "_seed/seed-test-01/B.png", dest: `${userId}/seed-test-01/B.png` },
    { src: "_seed/seed-test-02/A.png", dest: `${userId}/seed-test-02/A.png` },
    { src: "_seed/seed-test-02/B.png", dest: `${userId}/seed-test-02/B.png` },
  ];
}
