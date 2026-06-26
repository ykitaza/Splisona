# Requirements Document

## Project Description (Input)
というかメモリじゃなくてちゃんとスペックドリブンでやってみますか。 ゴールはペンシルでデザインを作ることだけど、計画的にやっていきましょうか。

## Introduction

本仕様は、A/Bテストプラットフォーム **Chorus** の UI を、Linear/Stripe 系のダーク世界観「無彩の管制室 × 発光する人格」で **Pencil（`design/pencil-new.pen`）上に設計** することを目的とする。成果物は実装コードではなく **Pencil デザイン（画面・コンポーネント）** である。

現行 React アプリ（ライトテーマ）を正としつつ、すでに設計済みの S1〜S5（ペルソナ管理一覧・結果レポート・実行中・新規テスト・ペルソナ選択モーダル）に続き、**未設計の画面群**をダーク世界観で完成させ、全画面を一つのデザインシステムとして統一する。設計の規律はプロジェクトの `CLAUDE.md`「Design Policy — Chorus UI」および steering に従う。

本仕様の「システム」は **Chorus UI デザイン**（`design/pencil-new.pen` の画面・コンポーネント群）を指す。受入基準は、その Pencil デザインが満たすべき視覚・構造・情報設計上の条件として記述する。

## Boundary Context

- **In scope（本仕様で設計する Pencil 画面・変更）**:
  - ペルソナ画面（作成/編集＋インタビュータブの統合・人格ヒーロー常時表示）：「編集」タブ（基本情報・属性・自由記述・AIアシスト）と「インタビュー」タブ（AIインタビュー）をタブで切り替える1画面。右に発光する人格ヒーローを常時表示する
  - S2 結果レポート画面の拡張（5軸レーダー・支持率・軸別詳細・支持理由のまとめ・ペルソナ別評価台帳・出所メタデータのオンデマンド開示〔集約＝見出しの「?」（HelpDot）／個別＝行クリック詳細〕とエクスポートの追加）。これまでのサイドバー置換のみから、メタデータ・可視化を加える大幅拡張に変更する
  - テスト一覧画面
  - 設定画面（Figma 連携）
  - About（Chorus について）モーダル
  - 既存 S1（ペルソナ管理一覧）への属性情報の追加
  - 全画面共通のサイドバーナビゲーションの統一
  - 既存 S1〜S5 を含む全画面のデザインシステム（脱・箱／発光規律／トークン／配色）準拠
- **Out of scope（本仕様では設計しない）**:
  - ダッシュボード画面（nav からも除外）
  - 独立した「ペルソナ選択ページ」（`/tests/new/personas` 相当。S4 への畳み込み＋S5 モーダルで代替済み）
  - 確認画面（`/tests/new/confirm` 相当。S4 の「作成して実行」に統合済み）
  - サインイン画面（当面保留）
  - 実装コード（React / バックエンド）の変更
- **Adjacent expectations（隣接する前提）**:
  - `design/pencil-new.pen` 内の既存トークン・コンポーネント（PersonaCard, PersonaNode 等）と既存画面 S1〜S5
  - `CLAUDE.md`「Design Policy — Chorus UI」のデザイン規律
  - 現行 React アプリ（`packages/frontend`）を情報設計の参照元とする（実装は変更しない）
  - S2 拡張の情報設計は `packages/frontend/src/types/index.ts` の `ReportResponse`/`ReportSummary`/`EvaluationResult`/`EvaluationScores` を参照元とする
  - **評価軸を4軸→5軸へ拡張**する前提（現行 `EvaluationScores` の usability/aesthetics/clarity/engagement に「信頼感（trust）」を追加）。本仕様ではデザイン上の表示枠を用意し、バックエンド実装は別途
  - **使用モデルは S9 設定の「既定モデル」**として1つ持ち、レポートにはその名称を表示する（テスト単位のモデル選択UIは設けない）
  - **ペルソナ合成プロンプト／評価軸の評価プロンプト**は現行型に無い新規メタデータ。デザインは「表示する枠」を用意し、バックエンド実装は別途
  - CVR/コンバージョン率は扱わず、支持率を頭出し指標とする

## Requirements

### Requirement 1: デザイン世界観と脱・箱規律の全画面準拠
**Objective:** デザイナーとして、全画面を「無彩の管制室 × 発光する人格」かつ Linear/Stripe 系の脱・箱規律で統一したい。これにより Chorus が一貫した世界観を持つプロダクトとして成立する。

#### Acceptance Criteria
1. The Chorus UI shall 無彩3階層（bg-base / bg-surface / bg-raised）＋単一アクセント＋セマンティック少数の配色のみを使用する。
2. When 見出しと内容の塊を配置するとき, the Chorus UI shall それを囲み枠カード（bg-surface＋罫＋角丸）に入れず、bg-base 紙面に直置きし、余白・hairline・タイポ階層で領域を分ける。
3. Where 比較対象のデザイン画像・データ表など「それ自体が独立したオブジェクト」を配置する場合, the Chorus UI shall 囲み枠カードの使用を許容する。
4. The Chorus UI shall 1 画面につき視覚的な主役（hero）を 1 つ立て、他の要素を従属させる。
5. The Chorus UI shall 発光（glow）を「人格（ペルソナ）」を表す要素にのみ適用し、ブランド・チップ・勝者枠などの UI シャーシには適用しない。
6. The Chorus UI shall 🏆 や 👑 等のゲーミフィケーション装飾を使用せず、階層を色とタイポグラフィで表現する。

### Requirement 2: デザイントークンへの準拠
**Objective:** デザイナーとして、spacing・タイポ・配色・ペルソナ色をトークンに統一したい。これにより値の一貫性と保守性が保たれる。

#### Acceptance Criteria
1. The Chorus UI shall spacing と font-size を 4/8 グリッドのトークン（`space-*` / `text-*`）にスナップする。
2. The Chorus UI shall 数値・ID・スコアを等幅フォント（font-mono）で表示する。
3. When ペルソナを色で識別するとき, the Chorus UI shall 同一彩度・明度に正規化されたペルソナ family 色トークン（`p-*`）を使用する。
4. Where 評価対象の外部物（アップロードされたデザイン画像など）を表示する場合, the Chorus UI shall パレット外の色を許容する。

### Requirement 3: サイドバーナビゲーションの統一
**Objective:** Chorus を使うデザイナーとして、全画面で同一のサイドバーから主要画面へ移動したい。これにより画面間の一貫した回遊ができる。

#### Acceptance Criteria
1. The Chorus UI shall 全画面で共通のサイドバー（ブランド・ナビゲーション・アカウント）を表示する。
2. The Chorus UI shall ナビゲーション項目を「ペルソナ」「A/Bテスト」「結果」の 3 項目とし、ダッシュボード項目を含めない。「設定」はナビゲーション項目に置かず、アカウントメニューに移す。
3. While ある画面を表示しているとき, the Chorus UI shall サイドバーで対応するナビゲーション項目をアクティブ状態（アクセント）で示す。
4. The Chorus UI shall サイドバー最下部にアカウント（アバター・名前・ロール・展開シェブロン）を表示し、これをアカウントメニューの起点とする。
5. When ユーザーがアカウント（アバター）を選択したとき, the Chorus UI shall アカウントメニューをポップオーバーとして表示し、その中に「設定」「Chorus について」「サインアウト」を提供する。サインアウトは danger 系で区別する。

### Requirement 4: ペルソナ管理一覧（S1）への属性情報の追加
**Objective:** Chorus を使うデザイナーとして、ペルソナ一覧で各ペルソナの属性（年齢・性別・職業ほか）を確認したい。これにより人格と属性の両面でペルソナを把握できる。

#### Acceptance Criteria
1. The Chorus UI shall ペルソナ管理一覧の各ペルソナカードに、人格（表示名・一言）を主役として表示する。
2. The Chorus UI shall 各ペルソナカードに属性（年齢・性別・職業を含む）を等幅フォントの脚注として表示する。
3. When 属性が未設定の項目があるとき, the Chorus UI shall その項目を欠損として静かに（プレースホルダ表記で）示す。
4. The Chorus UI shall 属性の追加表示後も、囲み枠を増やさず脱・箱規律と発光ノードによる識別を維持する。

### Requirement 5: ペルソナ画面 — 編集タブ（作成/編集）
**Objective:** Chorus を使うデザイナーとして、属性入力・自由記述・AI下書き・プレビューを統合ペルソナ画面の「編集」タブで行いペルソナを作成・編集したい。これにより素早く評価用ペルソナを定義できる。

本要件は、統合された「ペルソナ画面」の **「編集」タブ** が満たすべき条件を定める（同画面の「インタビュー」タブは Requirement 6）。同画面の右側には発光する人格ヒーローが常時表示される。

#### Acceptance Criteria
1. When ペルソナ画面の「編集」タブを表示するとき, the Chorus UI shall 基本情報（表示名・タイプ・アバター）、属性（年齢・性別・偏差値・年収・学歴・職業）、自由記述の入力領域を提供する。
2. The Chorus UI shall AIアシスト（属性をもとに人物像と自由記述を下書きする操作）への導線を提供する。
3. While ユーザーが入力しているとき, the Chorus UI shall 入力内容を反映したペルソナのライブプレビューを表示する。
4. The Chorus UI shall アバターとして発光アバター（seed から決定論生成される identicon）を用い、表示名 seed に基づくプレビューを表示する。
5. The Chorus UI shall 保存・キャンセルの操作を提供する。
6. The Chorus UI shall 入力フォームを囲み枠カードで多重に入れ子にせず、脱・箱規律で構成する。
7. The Chorus UI shall 属性と自由記述から合成される「プロンプトプレビュー」を確認できる導線・表示を提供する（合成プロンプトは新規メタデータであり、デザインは表示枠を用意する）。

### Requirement 6: ペルソナ画面 — インタビュータブ（AIインタビュー）
**Objective:** Chorus を使うデザイナーとして、統合ペルソナ画面の「インタビュー」タブでペルソナの人格を確認しつつチャットで質問したい。これにより仮説をペルソナ視点で素早く検証できる。

本要件は、統合された「ペルソナ画面」の **「インタビュー」タブ** が満たすべき条件を定める（属性の入力・編集は Requirement 5 の「編集」タブが担い、当該ペルソナの表示名・タイプ・人物像は同画面右側の人格ヒーローで常時確認できる）。

#### Acceptance Criteria
1. When ペルソナ画面を表示するとき, the Chorus UI shall 当該ペルソナの表示名・人物像（および属性は「編集」タブ）を確認でき、右側の人格ヒーローで表示名・タイプ・人物像スニペットを常時表示する。
2. The Chorus UI shall 「インタビュー」タブにペルソナとの対話（インタビュー）用のチャット領域とメッセージ入力欄を表示する。
3. While 対話履歴が空のとき, the Chorus UI shall 対話を促す空状態（プレースホルダ）を表示する。
4. The Chorus UI shall 発話者（ユーザー / ペルソナ）を視覚的に区別し、ペルソナ側に当該ペルソナの family 色を用いる。
5. The Chorus UI shall ヘッダー下のタブストリップ「編集 / インタビュー」で両タブを切り替え可能にし、アクティブタブを text-hi ＋ accent 下線、非アクティブを text-mid で示す。

### Requirement 7: テスト一覧画面
**Objective:** Chorus を使うデザイナーとして、過去のA/Bテストを一覧で確認・管理したい。これにより実行済みテストへ素早くアクセスできる。

#### Acceptance Criteria
1. When テスト一覧画面を表示するとき, the Chorus UI shall 各テストのテスト名・A/Bプレビュー・対象ペルソナ数・ステータス・日時を表示する。
2. The Chorus UI shall テスト件数と新規テスト作成への導線を表示する。
3. While テストが実行中のとき, the Chorus UI shall そのテストのステータスを実行中として区別表示する。
4. The Chorus UI shall 複数テストの一括削除の導線を提供する。
5. The Chorus UI shall 一覧を「台帳（hairline 行）」として構成し、各行を囲み枠カードにしない。

### Requirement 8: 設定画面
**Objective:** Chorus を使うデザイナーとして、Figma 連携のアクセストークンを管理したい。これにより Figma URL からデザイン画像を取得できる。

#### Acceptance Criteria
1. When 設定画面を表示するとき, the Chorus UI shall Figma 連携の接続状態とアクセストークン入力欄を表示する。
2. The Chorus UI shall トークンの更新操作と、トークン取得手順の案内を表示する。
3. While トークンが未設定のとき, the Chorus UI shall 接続状態を「未接続」として示す。
4. The Chorus UI shall アクセストークンの実値を画面上に平文表示しない入力方式（マスク）で扱う。
5. The Chorus UI shall 「既定モデル」の設定項目を提供し、ここで選択したモデル名を結果レポート（S2）の出所メタデータ（使用モデル）に表示する源流とする。

### Requirement 9: About（Chorus について）モーダル
**Objective:** Chorus を使うデザイナーとして、アプリ名とバージョンを確認したい。これにより利用中のビルドを把握できる。

#### Acceptance Criteria
1. When ユーザーがアカウントメニューから「Chorus について」を選択したとき, the Chorus UI shall ロゴ・アプリ名・タグライン・バージョンを表示するモーダルを表示する。
2. The Chorus UI shall モーダルを閉じる導線を提供する。
3. The Chorus UI shall モーダルを背景オーバーレイ上の独立オブジェクトとして表示する。

### Requirement 10: スコープ外画面の非作成
**Objective:** デザイナーとして、不要な画面を作らずスコープを絞りたい。これにより手戻りと過剰設計を避けられる。

#### Acceptance Criteria
1. The Chorus UI shall ダッシュボード画面を新規に設計しない。
2. The Chorus UI shall 独立したペルソナ選択ページ（テスト作成フロー内）を設計せず、S4 への畳み込みと S5 モーダルで代替する。
3. The Chorus UI shall テスト作成の確認専用画面を設計せず、S4 の「作成して実行」に統合する。
4. Where サインイン画面の設計が将来必要になる場合, the Chorus UI shall それを本仕様のスコープ外として保留する。

### Requirement 11: 結果レポート（S2）の拡張
**Objective:** Chorus を使うデザイナーとして、A/Bテストの結果を総合判定から軸別・ペルソナ別まで一画面で読み解き、必要に応じて各AI生成物の出所（モデル・プロンプト）をオンデマンドで確認したい。これにより判断根拠と再現性を伴ってデザインの優劣を把握できる。

本要件は、これまでサイドバー置換のみだった既存 S2 結果レポート画面を、メタデータ・可視化を加えて大幅拡張する条件を定める。情報設計は `ReportResponse`/`ReportSummary`/`EvaluationResult`/`EvaluationScores` を参照元とし、一部（5軸目・各種プロンプト・使用モデル）は新規メタデータとしてデザイン上の表示枠を用意する。

#### Acceptance Criteria
1. When 結果レポート画面を表示するとき, the Chorus UI shall ヘッダーにテスト名・実施日時・ステータス・対象ペルソナ数（completed/total）を表示する。
2. The Chorus UI shall 総合判定を主役（hero）として、勝者（A/B/tie）＋支持率（supportRateA/B/none を %）＋一言サマリー（winnersReasonSummary）を表示する。
3. The Chorus UI shall 比較デザインプレビューとして A/B 画像を並置し、各支持率と勝者印を既存踏襲で表示する。
4. The Chorus UI shall 評価軸レーダーチャートを表示し、5軸（使いやすさ／魅力／分かりやすさ／行動喚起／信頼感）を A vs B で重ね描画する（avgScores をバインド）。
5. The Chorus UI shall 軸スコアの算出方法を、各ペルソナが各軸を1〜5で採点した値の**全ペルソナの平均**（合計ではない）とし、人数に依らず**最大値を 5 で固定**してレーダー外周を 5 とする（正規化しない）。
6. The Chorus UI shall 支持率（A/B/none の勝敗）を各ペルソナの総合選好の**多数決**で算出し、軸スコア（平均）とは別系統の指標として扱う。
7. The Chorus UI shall 軸別の詳細として、軸ごとの A/B 平均スコア（1〜5、最大5固定）を数値またはバーで（レーダーの補助として）表示する。
8. The Chorus UI shall 支持理由のまとめとして、A支持／B支持の理由（reasonSummaryA[] / reasonSummaryB[]）を表示する。
9. The Chorus UI shall ペルソナ別評価を台帳として、表示名・選好（A/B）・確信度（confidence）・一言理由（reason）を行で表示する（LedgerRow を流用）。
10. The Chorus UI shall 結果レポート画面の本体に大きな再現メタデータ節を置かず、属性は人格（ペルソナ）側に、出所（使用モデル・プレースホルダ解決済みプロンプト・生成結果）はAI生成物側に紐づけてオンデマンドで開示する（責務分離：人格＝属性／生成物＝出所）。
11. The Chorus UI shall AI生成物の出所表示（「?」＝HelpDot：丸枠＋?）を二層に分け、**集約されたAI生成物（支持理由のまとめ・評価軸スコア〔レーダー〕）はセクション見出しに「?」を1つだけ**置き、**ペルソナ単位の生成物には行に「?」を貼らない**（コメント横の常時 ?（HelpDot） は廃止）構成とする。「?」はホバーで対応ポップオーバーを表示する。
12. When ユーザーがペルソナ（人格）を選択したとき, the Chorus UI shall そのペルソナの属性（年齢・性別・職業など、誰かが分かる情報）のみをポップオーバーで表示し、プロンプトやモデルは表示しない。
13. When ユーザーが集約AI生成ブロック（支持理由のまとめ・レーダー）の見出しの「?」（HelpDot）にホバーしたとき, the Chorus UI shall 当該集約生成物の生成元（使用モデル＋プロンプト。レーダーは加えて軸スコアの算出方法〔1〜5採点の全ペルソナ平均・最大5固定・正規化なし／支持率は多数決で別算出〕）をポップオーバーで表示する。
14. When ユーザーがペルソナ別評価台帳の行を選択したとき, the Chorus UI shall その行の詳細（使用モデル・解決済みプロンプト・生成コメント・各軸スコア）を表示し、行はホバーで chevron が出るのみとする。
15. While ペルソナ別評価台帳の行にホバーしていないとき, the Chorus UI shall コメント横に常時表示の「?」（HelpDot）を置かない。
16. When ユーザーがレポートをエクスポートするとき, the Chorus UI shall 全メタデータ（全プロンプト・使用モデル・各ペルソナの入出力・テスト設定）を含め、ヘッダーにエクスポートの導線を表示する。
17. The Chorus UI shall 使用モデル名を S9 設定の「既定モデル」を源流として出所表示・エクスポートに反映し、テスト単位のモデル選択UIを設けない。
18. The Chorus UI shall レーダーチャートの凡例（A案 / B案）を見出し行ではなく、見出しの直下に左寄せで置く。
19. Where 新規メタデータ（5軸目の信頼感・各種プロンプト・使用モデル）が現行型に無い場合, the Chorus UI shall デザイン上の表示枠（見出しの「?」（HelpDot）の算出方法／生成元ポップオーバー・行クリック詳細・エクスポート）を用意する（バックエンド実装は別途）。
