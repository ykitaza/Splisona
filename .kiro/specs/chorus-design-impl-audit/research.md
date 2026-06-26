# Research & Design Decisions

## Summary
- **Feature**: `chorus-design-impl-audit`
- **Discovery Scope**: Complex Integration（Pencil デザイン全画面 × 現行実装の突き合わせ）
- **Key Findings**:
  1. テーマ移行: 現行はハードコード色値 × ライトテーマ、デザインは CSS カスタムプロパティ前提のダークトークン体系
  2. ルーティング: 3 ルート廃止（PersonaSelect / Confirm / Settings）、2 ルート統合（PersonaEdit + Detail → S6）
  3. S2 結果レポートが最大工数画面 — 5 軸化・RadarChart・AttributeHeatmap・HelpDot 3 種が集中

## Research Log

### テーマトークン体系
- **Context**: 現行の全ファイルがインラインスタイルで色値をハードコード（`#F7F7F8`, `#FFFFFF`, `#E6E6E8`, `#1A1A1A`, `#9A9A9F`, `#666666`, `#3B7DD8`, `#E0883A` 等）。Tailwind CSS v4 が導入済みだがユーティリティクラスでの色指定はほぼなく、`style={}` 直書き。
- **Sources Consulted**: `AppLayout.tsx`, `TestReportPage.tsx`, `PersonaEditPage.tsx`, `PersonaCard.tsx`, `SettingsPage.tsx` 全ファイル
- **Findings**:
  - 背景系: `#F7F7F8` → `$bg-base`, `#FFFFFF` → `$bg-surface`, `#F0F1F3` → `$bg-raised`
  - 罫線: `#E6E6E8` → `$hairline`
  - テキスト: `#1A1A1A` → `$text-hi`, `#666666` → `$text-mid`, `#9A9A9F` → `$text-lo`
  - アクセント: `#3B7DD8` → `$accent`, `#E8F0FB` → `$accent-dim`
  - セマンティック: `#D64545` → `$danger`, `#2E9E5B` → `$success`
  - 勝敗: `#3B7DD8` → `$win-a`（`$accent` と同値）、`#E0883A` → `$win-b`
  - フォントファミリーは既に Geist / Geist Mono を使用しているが、CSS 変数化されていない
  - spacing は全てハードコード px（`gap: 8`, `padding: '24px 16px'` 等）→ `$space-*` トークン化が必要
- **Implications**: Tailwind CSS v4 の `@theme` ブロックで CSS カスタムプロパティとしてトークンを定義し、ダーク値をデフォルトに設定する方針が適切。インラインスタイルから Tailwind ユーティリティへの段階的移行。

### ルーティング構造の差分
- **Context**: `router.tsx` に 13 ルート定義。デザインは S1〜S10（S7 欠番）の 10 画面構成。
- **Findings**:
  - **廃止**: `/tests/new/personas`（TestPersonaSelectPage）→ S5 モーダルとして S4 上に統合
  - **廃止**: `/tests/new/confirm`（TestConfirmPage）→ S4「作成して実行」ボタンに統合
  - **廃止**: `/settings`（SettingsPage）→ S9 グローバルモーダル化
  - **統合**: `/personas/new` + `/personas/:id/edit` + `/personas/:id` → S6 統合ペルソナ画面（1ルート + タブ）
  - **変更**: `/`, `/dashboard`（DashboardPage）→ ナビから除外。デフォルトルート `/` を `/results` または `/personas` にリダイレクト
  - **保持**: `/results`（TestListPage → S8）、`/tests/:id/report`（TestReportPage → S2）、`/tests/:id/running`（TestRunningPage → S3）、`/tests/new`（TestInputPage → S4）
- **Implications**: Stepper コンポーネントは不要に。testDraft ライブラリのフロー管理も簡素化。SettingsPage の全機能をモーダルに移植する必要あり。

### コンポーネント対応分析
- **Context**: デザインの reusable コンポーネント 20 種 vs 現行 React コンポーネント群
- **Findings**:
  - **ダーク移行のみ（4 種）**: Sidebar, SidebarCollapsed, AccountMenu, AboutModal(S10)
  - **大幅改修（4 種）**: PersonaCard, SettingsPage→S9 Modal, ABTestTable→LedgerRow, PersonaEditPage→S6
  - **新規作成（10 種）**: PersonaNode, FieldSlider, SegmentControl, FormField, ChatBubble, RadarChart, HelpDot, AttributePopover, SourcePopover, MethodPopover, AttributeHeatmap（実質 11 種）
  - **廃止候補（4 種）**: Stepper, ABTestTable（LedgerRow に置換）, DonutChart（インライン、支持率バーに置換）, GeneratedAvatar（PersonaNode に置換）
- **Implications**: 新規コンポーネントの大半が S2 結果レポートに集中。S2 の実装を先に設計すれば、他画面はトークン移行中心で進められる。

### EvaluationScores 5 軸化の影響
- **Context**: 現行 4 軸（usability, aesthetics, clarity, engagement）→ デザインは 5 軸（+ trust）
- **Findings**:
  - フロントエンド型: `EvaluationScores` に `trust: number` 追加
  - バックエンド型: `EvaluationScores`（shared/types.ts）に同様追加
  - 評価プロンプト: `evaluation/orchestrator.ts` のプロンプトに trust 軸の指示追加
  - レポート集計: `report/handler.ts` の avgScores 計算に trust 含める
  - SCORE_LABELS: TestReportPage の 4 軸ラベルマップに trust 追加
  - RadarChart: 5 軸前提の新規コンポーネント
  - AttributeHeatmap: 5 軸 × 属性グループのマトリクス
- **Implications**: 型変更は破壊的だが影響範囲は限定的（評価生成〜レポート表示のパイプライン内）。既存データとの後方互換は trust をオプショナルにすれば対応可能。

### 設定画面の拡張
- **Context**: 現行は Figma トークン管理のみ（localStorage）。デザインは 4 セクション + プロンプト詳細サブ画面。
- **Findings**:
  - 一般: デザインに詳細なし → 要確認（placeholder セクション）
  - Figma 連携: 現行 localStorage → DynamoDB 移行の要否は判断保留
  - AI モデル: 既定モデル選択の永続化（現行は環境変数 `BEDROCK_MODEL_ID` のみ）→ ユーザー設定テーブル
  - プロンプト: 4 テンプレート（ペルソナ評価・理由要約・インタビュー・AI 下書き）の追加指示編集 → ユーザー設定テーブル
  - プロンプト詳細: 固定コンテキスト（読み取り専用）+ 固定指示（読み取り専用）+ 追加指示（編集可）
- **Implications**: DynamoDB に `SETTINGS#` プレフィックスのユーザー設定レコード追加。バックエンド API 2 エンドポイント（GET/PUT settings）。

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks | Notes |
|--------|-------------|-----------|-------|-------|
| 一括ダーク移行 | 全画面を一度にダーク + トークン化 | 一貫性保証 | 巨大 diff、レビュー困難 | 非推奨 |
| トークン基盤先行 | Tailwind テーマトークン定義 → 画面ごとに適用 | 段階的移行可能、各 PR が小さい | 過渡期に新旧混在 | 推奨 |
| 画面単位リビルド | S2 → S6 → S8 の順に画面を丸ごと再実装 | 最終品質が高い | 既存コードの再利用が少ない | 部分採用 |

## Design Decisions

### Decision: トークン導入方式
- **Context**: Tailwind CSS v4 が導入済みだが色値がハードコード
- **Alternatives**:
  1. CSS カスタムプロパティ（`--bg-base`）を直接定義
  2. Tailwind `@theme` ブロックでトークン定義 → `bg-base`, `text-hi` 等のユーティリティで使用
- **Selected Approach**: Option 2 — Tailwind `@theme` でトークンを一元管理
- **Rationale**: 既に Tailwind v4 が導入済み。CSS 変数の直接管理より Tailwind のユーティリティ体系に統合する方がエコシステムの恩恵を受けられる。
- **Trade-offs**: インラインスタイルからの移行工数が発生するが、型安全性は維持。
- **Follow-up**: `tailwind.css` の `@theme` ブロック設計を実装 spec で詳細化

### Decision: 段階的移行アプローチ
- **Context**: 全画面のダーク移行 + 機能拡張を同時に行うのは diff が巨大
- **Selected Approach**: 以下の優先順で段階実装
  1. P0: トークン基盤（Tailwind テーマ + CSS 変数）
  2. P1: AppLayout / Sidebar ダーク化 + ルーティング再編
  3. P2: S6 統合ペルソナ画面
  4. P3: S9 設定モーダル
  5. P4: S2 結果レポート拡張（最大工数）
  6. P5: S8 テスト一覧改修
  7. P6: 残画面のトークン適用

## Risks & Mitigations
- **既存データとの互換性**: trust 軸追加で既存 EvaluationRecord にフィールドなし → オプショナル型で後方互換、表示時は 0 扱い
- **設定のバックエンド永続化**: localStorage から DynamoDB 移行で既存ユーザーの Figma トークンが消失 → マイグレーション手順 or 初回アクセス時に localStorage → DB 移行
- **S2 の工数超過**: RadarChart + AttributeHeatmap + HelpDot 3 種が集中 → 独立コンポーネントとして先に開発し、S2 組み込みは最後に

## References
- Tailwind CSS v4 テーマカスタマイズ: `@theme` ブロック
- 現行デザインファイル: `design/pencil-new.pen`（20 reusable コンポーネント、12 画面）
- 既存 RadarChart スクリプト: `design/radar.js`（Canvas 描画、React 化が必要）
