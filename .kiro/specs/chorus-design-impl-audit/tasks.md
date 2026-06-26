# Implementation Plan

- [x] 1. Foundation: 現行コードベースとデザインファイルの構造走査
- [x] 1.1 フロントエンド全ファイルのハードコード色値・スタイルパターンを走査する
  - 全 `.tsx` / `.ts` ファイルからインラインスタイルの色値（`#F7F7F8`, `#FFFFFF`, `#E6E6E8`, `#1A1A1A`, `#9A9A9F`, `#666666`, `#3B7DD8`, `#E0883A`, `#D64545`, `#2E9E5B`, `#0A0A0A` 等）の出現箇所を列挙する
  - Tailwind CSS ユーティリティクラスでの色指定の有無を確認する
  - フォントファミリー（Geist, Geist Mono）の指定方式（インライン vs CSS 変数）を確認する
  - spacing 値（gap, padding, margin）のハードコード状況を把握する
  - 走査結果として「色値 → 出現ファイル × 出現回数」の一覧が得られること
  - _Requirements: 1.1_

- [x] 1.2 Pencil デザインの全画面・全 reusable コンポーネントのノード構造を読み込む
  - `design/pencil-new.pen` の全画面（S1〜S10、12 フレーム）のトップレベル構造を取得する
  - reusable コンポーネント 20 種の ID・名前・用途を一覧化する
  - デザイントークン（`$bg-base`, `$bg-surface`, `$accent`, `$win-a`, `$win-b` 等）の使用パターンを把握する
  - 全画面・全コンポーネントの一覧が参照可能な状態になること
  - _Requirements: 9.1, 9.2_

- [x] 2. テーマ・トークン体系の差分分析
- [x] 2.1 カラートークンマッピング表を作成し、Tailwind v4 テーマ導入方針を策定する
  - 1.1 の走査結果を基に、現行ハードコード色値とデザイントークンの対応表を作成する（`#F7F7F8` → `$bg-base` 等）
  - 勝敗トークン（`$win-a` = `$accent`、`$win-b`）の命名体系を明記する
  - Tailwind CSS v4 の `@theme` ブロックによるトークン定義方針を決定する
  - フォントファミリー（`$font-sans`, `$font-mono`）と spacing（`$space-*`、4/8 グリッド）の導入方法を特定する
  - 角丸トークン（`$r-sm`, `$r-md`, `$r-lg`）を含む全トークン体系が文書化されること
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 3. ルーティング・レイアウト差分分析
- [x] 3.1 ルート変更（統合・廃止・変更・保持）を列挙しリダイレクト戦略を策定する
  - `router.tsx` の全 13 ルートとデザイン画面（S1〜S10）を突き合わせる
  - 統合ルート（PersonaEditPage + PersonaDetailPage → S6）を特定する
  - 廃止ルート（TestPersonaSelectPage, TestConfirmPage, SettingsPage）を特定する
  - デフォルトルート `/` のリダイレクト先を決定する（`/personas` 推奨）
  - ルート変更一覧表が完成し、各変更に影響度が付与されていること
  - _Requirements: 2.1, 2.2_

- [x] 3.2 AppLayout・サイドバー・AccountMenu・AboutModal の変更点を確認する
  - ナビゲーション項目の変更（ダッシュボード/ペルソナ/A\|Bテスト → ペルソナ/A\|Bテスト/結果）を明記する
  - サイドバーのダーク配色移行（`$bg-surface`, ナビアクティブ: `$accent` + `$accent-dim`）を確認する
  - 折りたたみ機能の維持とトークン再実装の必要性を確認する
  - AccountMenu ポップオーバーの配色差分を確認する（機能は概ね一致、配色がライト→ダーク）
  - AboutModal の配色差分を確認する（レイアウトは概ね一致、`#F7F7F8` → `$bg-surface`）
  - 各コンポーネントの変更点が列挙され、影響度が付与されていること
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 4. 主要画面の差分分析
- [x] 4.1 (P) S2 結果レポートの全構成要素を並置して差分を列挙する
  - 現行 TestReportPage の構成（DonutChart, ScoreBars 4 軸, DesignCard, ペルソナテーブル, ReasonGroup）とデザイン S2 を項目ごとに比較する
  - DonutChart → 3 セグメントバー（A/B/引分）への置換を明記する
  - DesignCard の枠除去と勝者アクセントバー（左 2px `$win-a`）への変更を明記する
  - Trophy/ゲーミフィケーション装飾の削除を明記する
  - AttributeHeatmap（`sTZQ7`）の機能要件を明記する: 軸セレクター、A/B トグル（勝率ベース）、5 軸 × 属性グループのヒートマップグリッド
  - RadarChart の React 実装要件を特定する（`design/radar.js` の Canvas 実装を SVG/Canvas で再実装）
  - HelpDot 二層メタデータ開示の 3 パターン（MethodPopover / SourcePopover / AttributePopover）の実装要件を列挙する
  - 全構成要素の差分表が完成し、各項目に影響度が付与されていること
  - _Requirements: 5.1, 5.2, 5.3, 5.5_
  - _Boundary: S2 結果レポート, RadarChart, AttributeHeatmap, HelpDot, MethodPopover, SourcePopover, AttributePopover_

- [x] 4.2 (P) S6 統合ペルソナ画面の差分を分析する
  - 現行の 2 ページ構成（PersonaEditPage + PersonaDetailPage）とデザイン S6（1 ページ + タブ）の構造差分を列挙する
  - 編集タブの新規 UI 要素を列挙する: タブストリップ、FieldSlider（年齢・偏差値）、SegmentControl（性別）、プロンプトプレビュー、sticky フッター
  - インタビュータブの ChatBubble コンポーネント化を明記する
  - PersonaNode identicon アバター（seed ベース決定論生成）と現行 GeneratedAvatar・画像アップロードアバターの差分を特定する
  - 右カラムの人格ヒーロー（PersonaNode + 表示名 + タイプ + 人物像の常時表示）要件を明記する
  - 統合画面の差分表が完成し、新規コンポーネント要件が列挙されていること
  - _Requirements: 6.1, 6.2, 6.3_
  - _Boundary: S6 統合ペルソナ, PersonaNode, FieldSlider, SegmentControl, ChatBubble, FormField_

- [x] 4.3 (P) S9 設定モーダルの構造差分を分析する
  - 現行 SettingsPage（フルページ、Figma トークン管理のみ）とデザイン S9（グローバルモーダル、4 セクション）の構造差分を列挙する
  - 左ナビ + 検索バーの新規 UI を明記する
  - プロンプトテンプレート一覧（4 テンプレート）とプロンプト詳細サブ画面（戻りナビ + 固定コンテキスト + 固定指示 + 追加指示 + フッター）の要件を明記する
  - 設定モーダルのトリガー方式（AccountMenu →「設定」、任意画面から起動可）を確認する
  - 新規セクション（一般・AI モデル・プロンプト）に必要なバックエンド API・永続化を特定する
  - 構造差分表が完成し、バックエンド要件が列挙されていること
  - _Requirements: 4.1, 4.2, 4.3_
  - _Boundary: S9 設定モーダル, Modal_

- [x] 5. 補助画面・テスト作成フローの差分分析
- [x] 5.1 (P) S8 テスト一覧の差分を分析する
  - 現行 TestListPage + ABTestTable とデザイン S8 を比較する
  - LedgerRow（チェックボックス + サムネ + テスト名 + ペルソナ数 + ステータス + 日時）の要件を明記する
  - サムネイル仕様の差分を明記する: 現行は 1 枚の灰色矩形 → デザインは勝者デザイン 1 枚（DRAW→A案、未完了→A案）
  - ヘッダー行の列順変更（チェックボックス/プレビュー/テスト名/ペルソナ/ステータス/日付）を明記する
  - 一括削除モードの選択行ハイライト（`$accent-dim`）を確認する
  - テスト一覧の差分表が完成していること
  - _Requirements: 7.1, 7.2_
  - _Boundary: S8 テスト一覧, LedgerRow_

- [x] 5.2 (P) S4+S5 テスト作成フローと残画面（S1, S3, S10）の差分を分析する
  - S4 新規テスト: 3 ページ遷移（Stepper）→ 1 ページ + S5 モーダルへの統合を明記する
  - S5 ペルソナ選択モーダル: TestPersonaSelectPage のモーダル化要件を明記する
  - TestConfirmPage の廃止と S4「作成して実行」ボタンへの統合を明記する
  - S1 ペルソナ管理: ダーク配色移行 + PersonaCard の PersonaNode 統合を確認する
  - S3 実行中: ダーク配色移行のみ（レイアウト概ね一致）を確認する
  - S10 About モーダル: ダーク配色移行のみ（レイアウト概ね一致）を確認する
  - 全残画面の差分が列挙されていること
  - _Requirements: 2.1, 3.1, 3.3_
  - _Boundary: S4 新規テスト, S5 モーダル, S1, S3, S10_

- [x] 6. バックエンドデータモデル・API の差分分析
- [x] 6.1 (P) EvaluationScores 5 軸化の影響を特定する
  - `EvaluationScores` 型に `trust`（信頼感）を追加した場合の影響ファイル（フロントエンド型、バックエンド型、評価プロンプト、レポート集計、SCORE_LABELS）を列挙する
  - 既存データとの後方互換戦略（`trust` をオプショナルにして表示時は 0 扱い）を明記する
  - 合成プロンプト・使用モデル名・評価プロンプトの新規メタデータを列挙し、DynamoDB スキーマとの差分を明記する
  - 影響ファイル一覧と型変更案が文書化されていること
  - _Requirements: 5.4, 8.1_
  - _Boundary: EvaluationScores, バックエンド型定義_

- [x] 6.2 (P) 設定永続化とテスト一覧・Heatmap API の要件を特定する
  - 設定モーダル 4 セクション（一般・Figma 連携・AI モデル・プロンプト）に必要な DynamoDB レコード設計（`SETTINGS#` プレフィックス）を明記する
  - Figma トークンの localStorage → DynamoDB 移行の要否を判断する
  - テスト一覧 API（`GET /api/tests`）で `winner` フィールドを含めるかの設計判断を記載する
  - AttributeHeatmap 集計データの API 要件を明記する: セルの値は A 勝率（%）、A/B トグルで視点切替
  - 必要な API エンドポイント一覧（`GET/PUT /api/settings`, Heatmap 集計）が文書化されていること
  - _Requirements: 8.2, 8.3, 8.4_
  - _Boundary: 設定 API, テスト一覧 API, Heatmap API_

- [x] 7. コンポーネント対応表と差分台帳の構造化
- [x] 7.1 全 20 コンポーネントを分類し廃止候補を特定する
  - デザインの reusable コンポーネント 20 種を「ダーク移行のみ」「大幅改修」「新規作成」「新規（共通化）」に分類する
  - 各新規コンポーネントの用途と使用先画面を併記する
  - 廃止候補（Stepper, ABTestTable, DonutChart, GeneratedAvatar）を列挙し、廃止理由と依存箇所を明記する
  - 分類表と廃止候補表が完成していること
  - _Requirements: 9.1, 9.2_

- [x] 7.2 差分台帳を 5 カテゴリで構造化し影響度・依存関係を付与する
  - 全差分を「テーマ/トークン」「ルーティング」「画面（S1〜S10 個別）」「コンポーネント」「データモデル/API」の 5 カテゴリに整理する
  - 各差分項目に影響度（大/中/小）を付与する
  - 依存関係（何が先に必要か）を付与し、実装優先順序（P0〜P7）を策定する
  - Requirements Traceability 表で全 10 要件の全受入基準がカバーされていることを検証する
  - design.md として出力された差分台帳が次の実装 spec に直接入力可能な状態であること
  - _Requirements: 10.1, 10.2, 10.3_

- [x] 8. 差分台帳の完全性検証
- [x] 8.1 全要件・全受入基準のカバレッジを検証する
  - Requirements Traceability 表の全 30 行（1.1〜10.3）が差分台帳の具体的なセクションにマッピングされていることを確認する
  - design.md の各カテゴリに記載漏れがないか、requirements.md の受入基準と突き合わせる
  - デザインコンポーネント 20 種が全てコンポーネント対応表に含まれていることを確認する
  - 実装優先順序（P0〜P7）の依存関係が整合していることを確認する
  - 全検証項目がパスし、差分台帳が完成状態であること
  - _Requirements: 10.1, 10.2, 10.3_
