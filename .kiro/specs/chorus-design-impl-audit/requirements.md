# Requirements Document

## Introduction

本仕様は、Pencil デザイン（`design/pencil-new.pen` — 2026-06-26 時点の最新状態）と現行 React/サーバーレス実装のギャップを体系的に分析し、次の実装 spec への入力となる**差分台帳**を生成することを目的とする。

成果物は実装コードではなく、画面・コンポーネント・ルーティング・データモデル単位の差分リストと実装タスク候補である。

## Boundary Context

- **In scope**: Pencil デザイン（現在の `pencil-new.pen` の全画面 S1〜S10 + 全 reusable コンポーネント 20 種）と現行実装の突き合わせ、差分の列挙、タスク候補の構造化
- **Out of scope**: 実装コードの変更、Pencil デザインの修正
- **Adjacent expectations**: `pencil-new.pen` の現在の状態をデザインの正とする（chorus-pencil-screens spec の tasks.md は参考だが、現物のデザインが優先）

## Requirements

### Requirement 1: テーマ移行 — ライト→ダーク全面切り替え

**Objective:** フロントエンド開発者として、現行ライトテーマから Pencil デザインのダーク世界観への移行範囲を特定したい。これにより配色・トークン基盤の移行計画を立てられる。

#### Acceptance Criteria
1. The audit shall 現行のハードコード色値（`#F7F7F8`, `#FFFFFF`, `#E6E6E8`, `#1A1A1A` 等）を使用している全ファイルを列挙し、Pencil デザインのトークン（`$bg-base`, `$bg-surface`, `$bg-raised`, `$hairline`, `$text-hi`, `$text-mid`, `$text-lo` 等）へのマッピング表を作成する。
2. The audit shall Tailwind CSS v4 のテーマ設定でダークトークンを定義する方針（CSS カスタムプロパティ or Tailwind theme 拡張）を提示する。
3. The audit shall フォントファミリートークン（`$font-sans` = Geist, `$font-mono` = Geist Mono）と spacing トークン（`$space-*` = 4/8 グリッド）の導入方法を特定する。

### Requirement 2: ルーティング再編 — ページ統合・廃止・新設

**Objective:** プロジェクトリードとして、Pencil デザインの画面構成と現行ルーティング（`router.tsx`）の差分を明確にしたい。

#### Acceptance Criteria
1. The audit shall 以下のルーティング変更を特定し列挙する:
   - **統合**: PersonaEditPage (`/personas/new`, `/personas/:id/edit`) + PersonaDetailPage (`/personas/:id`) → 統合ペルソナ画面 S6（編集タブ＋インタビュータブの1ルート）
   - **廃止**: TestPersonaSelectPage (`/tests/new/personas`) → S4＋S5モーダルに統合済み
   - **廃止**: TestConfirmPage (`/tests/new/confirm`) → S4「作成して実行」に統合済み
   - **変更**: DashboardPage (`/`, `/dashboard`) → ナビから除外（デザインスコープ外）
   - **変更**: SettingsPage (`/settings`) → グローバルモーダル化（ルートなし、どの画面からも起動可）
   - **保持**: TestListPage (`/results`) を S8 テスト一覧として更新
2. The audit shall 廃止ルートのリダイレクト戦略（`/` のデフォルトルートをどこに向けるか）を提示する。

### Requirement 3: AppLayout / サイドバー改修

**Objective:** フロントエンド開発者として、サイドバー・ナビゲーション・アカウントメニューの改修範囲を把握したい。

#### Acceptance Criteria
1. The audit shall 現行 AppLayout の以下の変更点を列挙する:
   - ナビゲーション項目: 「ダッシュボード・ペルソナ・A/Bテスト」→「ペルソナ・A/Bテスト・結果」
   - ダーク配色への全面移行（sidebar: `$bg-surface`, nav active: `$accent` + `$accent-dim`）
   - 折りたたみ機能の維持（SidebarCollapsed 相当は現行に存在するが、デザイントークンで再実装）
2. The audit shall アカウントメニュー（AccountMenu ポップオーバー）の現行実装とデザインの差分を確認する（現行は概ね一致しているが配色がライトテーマ）。
3. The audit shall AboutModal の現行実装とデザインの差分を確認する（現行はライト配色だがレイアウトは概ね一致）。

### Requirement 4: 設定画面のモーダル化と大幅拡張（S9）

**Objective:** フロントエンド開発者として、設定画面がフルページからグローバルモーダルに変わり、4セクション＋プロンプト詳細画面が追加された差分を把握したい。

#### Acceptance Criteria
1. The audit shall 現行 SettingsPage（フルページ、Figma トークン管理のみ）とデザイン S9（グローバルモーダル）の構造差分を列挙する:
   - **形式変更**: フルページ (`/settings`) → グローバルモーダル（オーバーレイ表示、ルートなし）
   - **左ナビ追加**: 4セクション（一般・Figma連携・AIモデル・プロンプト）＋検索バー
   - **プロンプトテンプレート一覧**: ペルソナ評価・理由要約・インタビュー・AI下書きの4テンプレート表示
   - **プロンプト詳細サブ画面**: 戻りナビ＋固定コンテキスト（読み取り専用）＋固定指示（読み取り専用）＋追加指示（編集可）＋フッター（リセット/キャンセル/保存）
2. The audit shall 現行に存在しない新規セクション（一般・AIモデル・プロンプト）に必要なバックエンド API・永続化を特定する。
3. The audit shall 設定モーダルのトリガー方式（サイドバーのアカウントメニュー→「設定」、またはどの画面からも起動）を明記する。

### Requirement 5: 結果レポート拡張（S2）

**Objective:** フロントエンド開発者として、TestReportPage の大幅拡張に必要な変更を把握したい。最も工数の大きい画面改修である。

#### Acceptance Criteria
1. The audit shall 現行 TestReportPage と Pencil デザイン S2 の構成要素を並置して差分を列挙する:
   - **維持**: ヘッダー（テスト名・日時）、比較デザインプレビュー、ペルソナ別評価（ただし構造変更あり）、エクスポート
   - **追加**: 総合結果カード（支持率バー、勝者判定、一言サマリー）、5軸レーダーチャート、軸別詳細（バー表示）、支持理由のまとめ（A支持/B支持の理由リスト）、AttributeHeatmap（属性別ヒートマップ）、HelpDot二層メタデータ開示
   - **変更**: DonutChart → 支持率バー（水平）、ScoreBars 4軸 → 5軸、ペルソナテーブルの構造改変
   - **削除**: Trophy アイコン・ゲーミフィケーション装飾
2. The audit shall AttributeHeatmap（新規 reusable コンポーネント `sTZQ7`）の機能要件を明記する:
   - タイプ/性別/年齢層の軸セレクター（SegmentControl）
   - A/B トグル
   - 5軸（使いやすさ/魅力/分かりやすさ/行動喚起/信頼感）× ペルソナ属性グループのヒートマップグリッド
   - セル背景色の濃度でスコアを視覚化
3. The audit shall 5軸レーダーチャートの React 実装要件を特定する（現行の `design/radar.js` スクリプトを Canvas/SVG で再実装）。
4. The audit shall 評価軸 4軸→5軸（trust 追加）が `EvaluationScores` 型・バックエンド評価ロジック・プロンプトに与える影響を特定する。
5. The audit shall HelpDot 二層メタデータ開示（集約見出し「?」→MethodPopover / ペルソナ行クリック→SourcePopover / ペルソナ名クリック→AttributePopover）の実装要件を列挙する。

### Requirement 6: 統合ペルソナ画面（S6）

**Objective:** フロントエンド開発者として、PersonaEditPage と PersonaDetailPage を統合ペルソナ画面に再構成するための変更範囲を把握したい。

#### Acceptance Criteria
1. The audit shall 現行の2ページ構成と S6 の差分を列挙する:
   - **現行**: PersonaEditPage（フォーム＋PersonaCard プレビュー）＋ PersonaDetailPage（左ペインにペルソナ情報＋右ペインにチャット）
   - **S6**: 1ページ＋タブ切替（編集/インタビュー）、右カラムに人格ヒーロー（PersonaNode identicon＋表示名＋タイプ＋人物像）を常時表示
2. The audit shall 編集タブの新規 UI 要素を列挙する:
   - タブストリップ（`$accent` 下線でアクティブ表示）
   - 属性入力（年齢=スライダー、性別=セグメントコントロール、偏差値=スライダー）← 現行はすべてテキスト入力
   - プロンプトプレビュー（合成プロンプトの確認導線）
   - sticky フッター（削除=danger / キャンセル / 保存）
3. The audit shall identicon アバター（seed ベース決定論生成の PersonaNode）と現行 GeneratedAvatar・画像アップロードアバターの差分を特定する。

### Requirement 7: テスト一覧画面（S8）

**Objective:** フロントエンド開発者として、TestListPage の改修範囲を把握したい。

#### Acceptance Criteria
1. The audit shall 現行 TestListPage と S8 デザインの差分を列挙する:
   - 台帳スタイル（LedgerRow: チェックボックス＋プレビューサムネ＋テスト名＋ペルソナ数＋ステータス＋日時）
   - ツールバー（件数表示＋一括削除ボタン）
   - 一括削除モード（同一ルート・状態切替、選択行ハイライト `$accent-dim`、「削除/キャンセル」アクション）
   - プレビューサムネ仕様（勝者デザインのサムネ1枚、DRAW→A案、未完了→A案）
2. The audit shall ヘッダー行（Column Header: チェックボックス・プレビュー・テスト名・ペルソナ・ステータス・日付）の現行との差分を明記する。

### Requirement 8: バックエンドデータモデル・API の差分

**Objective:** バックエンド開発者として、デザインが前提とする新規データ・API の不足を把握したい。

#### Acceptance Criteria
1. The audit shall 以下の新規メタデータを列挙し、現行 DynamoDB スキーマ・型定義との差分を明記する:
   - `EvaluationScores.trust` — 5軸目（信頼感）の追加
   - 合成プロンプト — ペルソナの属性＋自由記述から生成されるプロンプトテキスト
   - 使用モデル名 — 設定の「既定モデル」を源流とし、テスト結果に記録
   - 評価プロンプト — 各テンプレート（ペルソナ評価・理由要約・インタビュー・AI下書き）の固定部分＋追加指示
2. The audit shall 設定モーダルの4セクション（一般・Figma連携・AIモデル・プロンプト）に必要な永続化を特定する:
   - 一般: 不明（デザインに詳細なし → 要確認）
   - Figma連携: 現行は localStorage（`chorus_figma_token`）→ DynamoDB への移行要否
   - AIモデル: 既定モデル選択の永続化（ユーザー設定）
   - プロンプト: テンプレートの追加指示の永続化（ユーザー設定）
3. The audit shall テスト一覧 API（S8 のデータ取得）の現行対応状況を確認する。
4. The audit shall AttributeHeatmap が必要とする集計データ（属性グループ × 評価軸のスコアマトリクス）の API 要件を特定する。

### Requirement 9: コンポーネント対応表

**Objective:** フロントエンド開発者として、Pencil の reusable コンポーネント 20 種と現行コンポーネントの対応を把握したい。

#### Acceptance Criteria
1. The audit shall 以下の分類で全コンポーネントを整理する:
   - **ダーク移行のみ**: 現行に機能的に存在し、配色移行で対応可能（例: AppLayout→Sidebar, AboutModal→S10）
   - **大幅改修**: 現行に存在するが構造が大きく異なる（例: PersonaCard, SettingsPage→S9 Modal）
   - **新規作成**: 現行に存在しない（例: FieldSlider, SegmentControl, ChatBubble, LedgerRow, RadarChart, HelpDot, AttributePopover, SourcePopover, MethodPopover, AttributeHeatmap）
   - **廃止候補**: デザインで使われなくなったもの（例: Stepper, ABTestTable, DonutChart）
2. The audit shall 各新規コンポーネントの用途と使用先画面を併記する。

### Requirement 10: 差分台帳の構造化出力

**Objective:** プロジェクトリードとして、監査結果を次の実装 spec に直接入力できる形式で受け取りたい。

#### Acceptance Criteria
1. The audit shall 差分を「テーマ/トークン」「ルーティング」「画面（S1〜S10 個別）」「コンポーネント」「データモデル/API」の5カテゴリで構造化する。
2. The audit shall 各差分項目に影響度（大/中/小）と依存関係（何が先に必要か）を付与する。
3. The audit shall 差分台帳を design.md として出力し、次の実装 spec の入力として利用可能にする。
