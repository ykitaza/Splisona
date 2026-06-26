# Design Document — Chorus デザイン・実装監査 差分台帳

## Overview

本ドキュメントは Pencil デザイン（`design/pencil-new.pen` — 2026-06-26 時点）と現行 React/サーバーレス実装の差分を体系的に整理した**差分台帳**である。次の実装 spec への直接入力として利用する。

**Purpose**: デザインと実装のギャップを 5 カテゴリで構造化し、各差分の影響度と依存関係を明示する。
**Users**: フロントエンド開発者、バックエンド開発者、プロジェクトリードが実装計画の策定に利用する。
**Impact**: 全画面のダークテーマ移行、ルーティング再編、主要画面 4 つの大幅改修、新規コンポーネント 10 種以上の追加。

### Goals
- Pencil デザイン全画面（S1〜S10）と現行実装の差分を網羅的に列挙する
- 各差分に影響度（大/中/小）と依存関係を付与する
- 次の実装 spec に直接入力可能な構造で出力する

### Non-Goals
- 実装コードの変更（本 spec は分析のみ）
- Pencil デザインの修正提案
- パフォーマンス要件やセキュリティ要件の定義

## Boundary Commitments

### This Spec Owns
- デザインと実装のギャップ分析結果
- 差分の分類・影響度評価・依存関係マッピング
- コンポーネント対応表

### Out of Boundary
- 実装コードの変更
- デザインファイルの修正
- バックエンド API の詳細設計（差分の列挙まで）

### Allowed Dependencies
- `design/pencil-new.pen` の現在の状態をデザインの正とする
- `chorus-pencil-screens` spec の tasks.md は参考情報として使用

### Revalidation Triggers
- `pencil-new.pen` のデザイン変更
- 新画面（S7 等）の追加
- コンポーネントの追加・削除

---

## カテゴリ 1: テーマ / トークン

### 1-A. カラートークンマッピング

| 現行ハードコード値 | 用途 | デザイントークン | ファイル数 | 出現数 | 影響度 |
|---|---|---|---|---|---|
| `#F7F7F8` | ページ背景 | `$bg-base` | 9 | 23 | 大 |
| `#FFFFFF` | カード/サイドバー背景 | `$bg-surface` | 19 | 90 | 大 |
| `#F0F1F3` | raised 背景・テーブルヘッダ | `$bg-raised` | 14 | 30 | 中 |
| `#E6E6E8` | ボーダー / セパレータ | `$hairline` | 16 | 79 | 大 |
| `#1A1A1A` | 主要テキスト | `$text-hi` | 17 | 89 | 大 |
| `#666666` | セカンダリテキスト | `$text-mid` | 16 | 56 | 大 |
| `#9A9A9F` | 補助テキスト / ラベル | `$text-lo` | 16 | 99 | 大 |
| `#3B7DD8` | アクセント / A案カラー | `$accent`（勝敗文脈では `$win-a` としても使用） | 14 | 53 | 大 |
| `#E8F0FB` | アクセント薄 / A案背景 | `$accent-dim` | 7 | 17 | 中 |
| `#E0883A` | B案カラー | `$win-b`（デザイントークン名。現行コードでは `$sideB` 相当） | 7 | 16 | 小 |
| `#FBF0E4` | B案背景 | `$win-b-dim` | 5 | 8 | 小 |
| `#D64545` | 危険 / エラー | `$danger` | 12 | 25 | 中 |
| `#2E9E5B` | 成功 | `$success` | 9 | 12 | 小 |
| `#0A0A0A` | プライマリボタン背景 | `$text-hi`（ダーク反転） | 13 | 18 | 中 |

**補足: 主要トークン外のハードコード色値（トークン移行時に合わせて置換）**

| 現行値 | 用途 | 推奨トークン | ファイル数 |
|---|---|---|---|
| `#C4C4C8`, `#D4D4D8` | disabled / placeholder ボーダー | `$hairline` or `$text-lo` | 5 |
| `#FDEAEA`, `#FBEAEA`, `#FFF0F0` | danger 背景（削除確認等） | `$danger-dim`（新規） | 7 |
| `#E6F4EC` | success 背景（完了ステータス等） | `$success-dim`（新規） | 8 |
| `#4F9D69` | 引分カラー | `$draw`（新規） | 1 |
| `#0284C7`, `#7C3AED` 等 | ペルソナタイプ別アクセント | PersonaNode identicon 置換で廃止 | 4 |
| GeneratedAvatar パレット 16 色 | アバター生成用 | PersonaNode 置換で廃止 | 1 |

**影響度**: 大 / **依存関係**: なし（最初に実施可能）

### 1-B. Tailwind CSS v4 トークン導入方針

- **方式**: `index.css` の `@theme` ブロックで CSS カスタムプロパティを定義（現行 `index.css` は `@import "tailwindcss"` + keyframes のみ、テーマ定義なし）
- **値**: ダーク値をデフォルトとし、明示的にダークテーマのみ運用
- **移行**: インラインスタイル `style={{ color: '#1A1A1A' }}` → Tailwind ユーティリティ `className="text-hi"` へ段階移行（全 19 ファイル・合計 617+ 箇所のインラインスタイルが対象）

**影響度**: 大 / **依存関係**: なし

### 1-C. フォント・spacing トークン

| トークン | 値 | 現行の状態 |
|---|---|---|
| `$font-sans` | `'Geist', sans-serif` | インラインスタイルで `fontFamily: 'Geist, sans-serif'` と直書き（全ファイルで統一済み） |
| `$font-mono` | `'Geist Mono', monospace` | インラインスタイルで `fontFamily: 'Geist Mono, monospace'` と直書き（ABTestTable, TestRunningPage 等で使用） |
| `$space-1` 〜 `$space-8` | 4px 刻みの倍数（4, 8, 12, 16, 20, 24, 32, 40） | インラインスタイルで `gap`, `padding`, `margin` に px 値を直書き。Tailwind ユーティリティクラスの使用なし |
| `$r-sm`, `$r-md`, `$r-lg` | 角丸トークン（6, 10, 16） | インラインスタイルで `borderRadius: 6` / `9999`（pill）等を直書き |

**影響度**: 中 / **依存関係**: 1-B（Tailwind テーマ定義）

---

## カテゴリ 2: ルーティング

### 2-A. ルート変更一覧

| 変更種別 | 現行ルート | 現行コンポーネント | デザイン対応 | 影響度 |
|---|---|---|---|---|
| **統合** | `/personas/new`, `/personas/:id/edit` | PersonaEditPage | S6 統合ペルソナ画面（編集タブ） | 大 |
| **統合** | `/personas/:id` | PersonaDetailPage | S6 統合ペルソナ画面（インタビュータブ） | 大 |
| **廃止** | `/tests/new/personas` | TestPersonaSelectPage | S5 モーダル（S4 上のオーバーレイ） | 中 |
| **廃止** | `/tests/new/confirm` | TestConfirmPage | S4 の「作成して実行」ボタンに統合 | 中 |
| **廃止** | `/settings` | SettingsPage | S9 グローバルモーダル（ルートなし） | 中 |
| **変更** | `/`, `/dashboard` | DashboardPage | ナビから除外。デフォルトルートをリダイレクト | 小 |
| **更新** | `/results` | TestListPage | S8 テスト一覧として更新 | 中 |
| **更新** | `/tests/:id/report` | TestReportPage | S2 結果レポート（大幅拡張） | 大 |
| **保持** | `/tests/new` | TestInputPage | S4（デザイン入力 + ペルソナ選択統合） | 中 |
| **保持** | `/tests/:id/running` | TestRunningPage | S3（ダーク化のみ） | 小 |
| **保持** | `/personas` | PersonaListPage | S1（ダーク化 + 微調整） | 小 |

### 2-B. リダイレクト戦略

- `/` → `/personas` へリダイレクト（デザインのサイドバーでペルソナが最上位ナビ）
- `/dashboard` → `/personas` へリダイレクト
- `/settings` → リダイレクト不要（モーダルなのでルート自体を削除）

**影響度**: 小 / **依存関係**: 2-A

---

## カテゴリ 3: 画面別差分

### S1 ペルソナ管理

| 項目 | 現行 | デザイン | 影響度 |
|---|---|---|---|
| 配色 | ライト | ダーク（`$bg-base`） | 中 |
| PersonaCard | ライト配色、ドロップダウンメニュー | ダーク、PersonaNode identicon アバター | 中 |
| ナビ項目 | ダッシュボード/ペルソナ/A\|Bテスト | ペルソナ/A\|Bテスト/結果 | 小 |

**依存関係**: 1-A（トークン）、9-A（PersonaNode コンポーネント）

### S2 結果レポート（最大工数）

| 項目 | 現行（TestReportPage） | デザイン（S2） | 影響度 |
|---|---|---|---|
| 総合結果 | DonutChart + 「🏆 WINNER」テキスト | 3 セグメントバー（A/B/引分）+ 判定テキスト +「6人中4人がAを支持」サブテキスト | 大 |
| 評価軸 | 4 軸（usability, aesthetics, clarity, engagement） | 5 軸（+ trust） | 大 |
| レーダーチャート | なし | 5 軸 RadarChart（SVG/Canvas） | 大 |
| 軸別比較 | ScoreBars（4 軸、カード内） | バー表示（5 軸、セクション分離） | 中 |
| 支持理由 | ReasonGroup（A/B 分離済み） | A 支持 / B 支持の理由リスト（構造同等） | 小 |
| AttributeHeatmap | なし | 属性別ヒートマップ（タイプ/性別/年齢軸 + A/B トグル + 5 軸グリッド） | 大 |
| HelpDot | なし | 3 種（MethodPopover / SourcePopover / AttributePopover） | 大 |
| ペルソナテーブル | 展開可能行（名前/勝者/コメント/軸別スコア） | 構造改変（HelpDot 統合、PersonaNode アバター表示） | 中 |
| Trophy/ゲーミフィ | `🏆 WINNER`、Trophy アイコン | 削除（色とタイポで階層表現） | 小 |
| DesignCard | カード形式（全周ボーダー + Trophy バッジ） | 枠除去。勝者 A にアクセントバー（左 2px `$win-a`）のみ、Trophy 廃止 | 中 |

**依存関係**: 1-A（トークン）、8-A（trust 軸追加）、9-A（RadarChart, AttributeHeatmap, HelpDot, MethodPopover, SourcePopover, AttributePopover）、8-D（AttributeHeatmap API）

### S3 実行中

| 項目 | 現行 | デザイン | 影響度 |
|---|---|---|---|
| 配色 | ライト | ダーク | 小 |
| レイアウト | 概ね一致 | トークン適用 | 小 |

**依存関係**: 1-A

### S4 新規テスト

| 項目 | 現行（TestInputPage + TestPersonaSelectPage + TestConfirmPage） | デザイン（S4 + S5 モーダル） | 影響度 |
|---|---|---|---|
| フロー | 3 ページ遷移（ステッパー表示） | 1 ページ + モーダル | 大 |
| ペルソナ選択 | 専用ページ（TestPersonaSelectPage） | S5 モーダル（オーバーレイ） | 中 |
| 確認画面 | 専用ページ（TestConfirmPage） | 「作成して実行」ボタンに統合 | 中 |
| Stepper | Stepper コンポーネント使用 | 廃止 | 小 |
| 配色 | ライト | ダーク | 中 |

**依存関係**: 1-A、2-A（ルーティング廃止）、9-A（Modal コンポーネント）

### S6 統合ペルソナ画面

| 項目 | 現行 | デザイン（S6） | 影響度 |
|---|---|---|---|
| ページ構成 | 2 ページ（PersonaEditPage + PersonaDetailPage） | 1 ページ + タブ（編集/インタビュー） | 大 |
| タブストリップ | なし | `$accent` 下線でアクティブ表示 | 中 |
| 右カラム | PersonaCard プレビュー + AI アシスト | PersonaNode identicon + 表示名 + タイプ + 人物像（常時表示） | 大 |
| 年齢入力 | `<input type="range">`（ネイティブ） | FieldSlider（カスタム） | 中 |
| 性別入力 | インラインボタン群 | SegmentControl コンポーネント | 中 |
| 偏差値入力 | `<input type="range">`（ネイティブ） | FieldSlider | 中 |
| プロンプトプレビュー | なし | 合成プロンプトの確認導線 | 中 |
| sticky フッター | 非 sticky（ページ末尾） | sticky フッター（削除=danger / キャンセル / 保存） | 小 |
| アバター | 画像アップロード / GeneratedAvatar（イニシャル/seed 生成） | PersonaNode identicon（seed ベース決定論生成） | 中 |
| インタビュー | 専用ページ（左ペイン情報 + 右ペインチャット） | S6 インタビュータブ（ChatBubble コンポーネント使用） | 大 |

**依存関係**: 1-A、2-A（ルート統合）、9-A（PersonaNode, FieldSlider, SegmentControl, ChatBubble, FormField）

### S8 テスト一覧

| 項目 | 現行（TestListPage + ABTestTable） | デザイン（S8） | 影響度 |
|---|---|---|---|
| 行コンポーネント | ABTestTable（統合テーブル） | LedgerRow（チェック + サムネ + テスト名 + ペルソナ数 + ステータス + 日時） | 中 |
| サムネイル | 1 枚の灰色矩形（画像なし時のプレースホルダ） | 勝者デザイン 1 枚（DRAW→A案、未完了→A案） | 中 |
| ツールバー | 件数 + 一括削除ボタン | 同等（配色変更） | 小 |
| 一括削除モード | 状態切替（selectionMode）、チェックボックス列、「キャンセル/削除」アクション | 同等構造、選択行ハイライト `$accent-dim` | 小 |
| ヘッダー行 | テスト名/プレビュー/ペルソナ/ステータス/日時/アクション | チェックボックス/プレビュー/テスト名/ペルソナ/ステータス/日付（列順変更） | 小 |

**依存関係**: 1-A、9-A（LedgerRow）

### S9 設定モーダル

| 項目 | 現行（SettingsPage） | デザイン（S9） | 影響度 |
|---|---|---|---|
| 形式 | フルページ（`/settings`） | グローバルモーダル（オーバーレイ） | 大 |
| セクション | Figma 連携のみ | 4 セクション（一般・Figma 連携・AI モデル・プロンプト）+ 検索バー | 大 |
| 左ナビ | なし | セクション切替の左ナビ | 中 |
| プロンプトテンプレート一覧 | なし | 4 テンプレート（ペルソナ評価・理由要約・インタビュー・AI 下書き） | 大 |
| プロンプト詳細 | なし | サブ画面（戻りナビ + 固定コンテキスト + 固定指示 + 追加指示 + フッター） | 大 |
| トリガー | サイドバー NavLink `/settings` | AccountMenu →「設定」、任意画面から起動可 | 中 |
| バックエンド | なし（localStorage のみ） | ユーザー設定 API（GET/PUT） | 大 |

**依存関係**: 1-A、2-A（ルート廃止）、8-B（バックエンド永続化）、9-A（Modal コンポーネント）

### S10 About モーダル

| 項目 | 現行（AboutModal in AppLayout） | デザイン（S10） | 影響度 |
|---|---|---|---|
| レイアウト | 概ね一致（C ロゴ + 名前 + バージョン） | ダーク配色 | 小 |
| 配色 | ライト（`#F7F7F8` 背景） | ダーク（`$bg-surface`） | 小 |

**依存関係**: 1-A

---

## カテゴリ 4: コンポーネント対応表

### 4-A. 分類一覧

| デザインコンポーネント | ID | 分類 | 現行対応 | 使用先画面 | 影響度 |
|---|---|---|---|---|---|
| PersonaNode | `CtjwC` | 新規作成 | GeneratedAvatar（機能異なる） | S1, S2, S6 | 中 |
| PersonaCard | `MrWyv` | 大幅改修 | PersonaCard.tsx | S1 | 中 |
| Sidebar | `t7eGu` | ダーク移行 | AppLayout.tsx（サイドバー部分） | 全画面 | 中 |
| SidebarCollapsed | `m7ZyZ` | ダーク移行 | AppLayout.tsx（collapsed 状態） | 全画面 | 小 |
| AccountMenu | `e4X98d` | ダーク移行 | AppLayout.tsx（ポップオーバー部分） | 全画面 | 小 |
| Button | `vGIoC` | 新規（共通化） | 散在するインラインボタン | 全画面 | 中 |
| FieldText | `Y8DeZ` | 新規（共通化） | TextInput（PersonaEditPage 内） | S6, S9 | 小 |
| FieldSelect | `t9YqC` | 新規（共通化） | select 要素（PersonaEditPage 内） | S6, S9 | 小 |
| FieldSlider | `OZAPi` | 新規作成 | ネイティブ `<input type="range">` | S6 | 中 |
| SegmentControl | `JoRkX` | 新規作成 | インラインボタン群（性別選択） | S6, S2（AttributeHeatmap 内） | 中 |
| FormField | `X8n8x` | 新規作成 | なし | S6, S9 | 小 |
| ChatBubble | `l3By6` | 新規作成 | インライン div（PersonaDetailPage） | S6（インタビュータブ） | 小 |
| LedgerRow | `v8Y5v` | 新規作成 | ABTestTable.tsx（構造異なる） | S8 | 中 |
| Modal | `fLFug` | 新規（共通化） | ConfirmDeleteModal.tsx（限定的） | S5, S9, S10 | 中 |
| RadarChart | `xU1jg` | 新規作成 | design/radar.js（Canvas、React 化必要） | S2 | 大 |
| AttributePopover | `ApVIQ` | 新規作成 | なし | S2 | 中 |
| SourcePopover | `TUMSz` | 新規作成 | なし | S2 | 中 |
| MethodPopover | `fqOP8` | 新規作成 | なし | S2 | 中 |
| HelpDot | `aGpDL` | 新規作成 | なし | S2 | 中 |
| AttributeHeatmap | `sTZQ7` | 新規作成 | なし | S2 | 大 |

### 4-B. 廃止候補

| 現行コンポーネント | ファイル | 廃止理由 | 依存箇所 |
|---|---|---|---|
| Stepper | `components/Stepper.tsx` | テスト作成フローが S4 単一ページ化 | TestInputPage, TestPersonaSelectPage, TestConfirmPage |
| ABTestTable | `components/ABTestTable.tsx` | LedgerRow に置換 | TestListPage, DashboardPage |
| DonutChart | `TestReportPage.tsx` 内インライン | 3 セグメントバー（A/B/引分）に置換 | TestReportPage |
| GeneratedAvatar | `components/persona/GeneratedAvatar.tsx` | PersonaNode identicon に置換 | PersonaCard |

---

## カテゴリ 5: データモデル / API

### 5-A. EvaluationScores 5 軸化

```typescript
// 現行（4 軸）
interface EvaluationScores {
  usability: number;
  aesthetics: number;
  clarity: number;
  engagement: number;
}

// 移行後（5 軸）
interface EvaluationScores {
  usability: number;
  aesthetics: number;
  clarity: number;
  engagement: number;
  trust: number;       // 新規: 信頼感
}
```

| 影響ファイル | 変更内容 | 影響度 |
|---|---|---|
| `packages/frontend/src/types/index.ts` | `EvaluationScores` に `trust` 追加 | 中 |
| `packages/backend/src/shared/types.ts` | `EvaluationScores` に `trust` 追加 | 中 |
| `packages/backend/src/evaluation/orchestrator.ts` | 評価プロンプトに trust 軸の指示追加 | 中 |
| `packages/backend/src/report/handler.ts` | avgScores 集計に trust 含める | 中 |
| `packages/frontend/src/pages/TestReportPage.tsx` | `SCORE_LABELS` に trust 追加、5 軸表示 | 中 |

**後方互換**: 既存データの `trust` は `undefined` → 表示時は 0 または N/A 扱い

**影響度**: 中 / **依存関係**: なし

### 5-B. 設定データの永続化

| セクション | 現行 | 移行先 | 新規 DynamoDB レコード |
|---|---|---|---|
| 一般 | 存在しない | 要確認（デザインに詳細なし） | — |
| Figma 連携 | `localStorage('chorus_figma_token')` | DynamoDB（要判断） | `PK: USER#<id>, SK: SETTINGS#figma` |
| AI モデル | 環境変数 `BEDROCK_MODEL_ID` のみ | ユーザー設定 | `PK: USER#<id>, SK: SETTINGS#model` |
| プロンプト | 存在しない | ユーザー設定（追加指示のみ永続化） | `PK: USER#<id>, SK: SETTINGS#prompt#<template>` |

**必要な API**:

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/settings` | ユーザー設定の全セクション取得 |
| PUT | `/api/settings` | ユーザー設定の更新（セクション指定） |

**影響度**: 大 / **依存関係**: なし（独立して実装可能）

### 5-C. テスト一覧 API

- 現行の `GET /api/tests` は S8 のデータ取得に概ね対応済み
- サムネイル: 現行は `designAInput.imageKey` / `designBInput.imageKey` を返却 → 勝者画像の特定にはレポート集計が必要
- **追加必要**: 一覧取得時に各テストの `winner` フィールドを含めるか、フロントエンドで個別レポート取得するかの設計判断

**影響度**: 小 / **依存関係**: なし

### 5-D. AttributeHeatmap 集計データ

- 現行 API にはペルソナ属性グループ（タイプ/性別/年齢層）× 評価軸のクロス集計エンドポイントが存在しない
- セルの値は**平均スコアではなく A 勝率（%）**。各属性グループ × 軸の組み合わせで「A を選んだペルソナの割合」を表示する
- A/B トグルで視点を切替（A 勝率 ↔ B 勝率）
- 必要なデータ: `Record<属性グループ値, Record<軸名, { winRateA: number; winRateB: number }>>`
- **選択肢**:
  1. バックエンドで集計 API を新設（`GET /api/tests/:id/heatmap?axis=type`）
  2. フロントエンドで既存の evaluations + personas データから算出

**影響度**: 中 / **依存関係**: 5-A（5 軸化）

---

## Requirements Traceability

| Requirement | Summary | カテゴリ | 対応セクション |
|---|---|---|---|
| 1.1 | 色値列挙 + トークンマッピング表 | テーマ | 1-A |
| 1.2 | Tailwind v4 テーマ方針 | テーマ | 1-B |
| 1.3 | フォント・spacing トークン導入 | テーマ | 1-C |
| 2.1 | ルーティング変更リスト | ルーティング | 2-A |
| 2.2 | リダイレクト戦略 | ルーティング | 2-B |
| 3.1 | AppLayout 変更点 | 画面 S1 / Sidebar | S1, 4-A (Sidebar) |
| 3.2 | AccountMenu 差分 | 画面 / コンポーネント | 4-A (AccountMenu) |
| 3.3 | AboutModal 差分 | 画面 S10 | S10 |
| 4.1 | 設定画面構造差分 | 画面 S9 | S9 |
| 4.2 | 設定のバックエンド API | データモデル | 5-B |
| 4.3 | 設定モーダルのトリガー | 画面 S9 | S9 |
| 5.1 | TestReportPage 構成差分 | 画面 S2 | S2 |
| 5.2 | AttributeHeatmap 要件 | コンポーネント | 4-A (AttributeHeatmap) |
| 5.3 | RadarChart 実装要件 | コンポーネント | 4-A (RadarChart) |
| 5.4 | 4→5 軸の影響 | データモデル | 5-A |
| 5.5 | HelpDot 二層メタデータ | コンポーネント | 4-A (HelpDot, *Popover) |
| 6.1 | ペルソナ画面統合差分 | 画面 S6 | S6 |
| 6.2 | 編集タブ新規 UI | 画面 S6 | S6 |
| 6.3 | identicon アバター差分 | コンポーネント | 4-A (PersonaNode) |
| 7.1 | TestListPage 差分 | 画面 S8 | S8 |
| 7.2 | ヘッダー行差分 | 画面 S8 | S8 |
| 8.1 | 新規メタデータ | データモデル | 5-A, 5-B |
| 8.2 | 設定永続化 | データモデル | 5-B |
| 8.3 | テスト一覧 API | データモデル | 5-C |
| 8.4 | AttributeHeatmap API | データモデル | 5-D |
| 9.1 | コンポーネント分類表 | コンポーネント | 4-A |
| 9.2 | 新規コンポーネント用途 | コンポーネント | 4-A |
| 10.1 | 5 カテゴリ構造化 | 全体 | カテゴリ 1〜5 |
| 10.2 | 影響度・依存関係 | 全体 | 各項目に付与 |
| 10.3 | design.md 出力 | 全体 | 本ドキュメント |

---

## 実装優先順序（推奨）

| 順序 | スコープ | 影響度 | 依存関係 | 推定規模 |
|---|---|---|---|---|
| P0 | トークン基盤（Tailwind テーマ + CSS 変数定義） | 大 | なし | 小 |
| P1 | AppLayout / Sidebar ダーク化 + ナビ項目変更 + ルーティング再編 | 大 | P0 | 中 |
| P2 | S6 統合ペルソナ画面（2 ページ → 1 ページ + タブ + 新規コンポーネント群） | 大 | P0, P1 | 大 |
| P3 | S9 設定モーダル（フルページ → モーダル + 4 セクション + バックエンド API） | 大 | P0, P1 | 大 |
| P4 | S2 結果レポート拡張（5 軸化 + RadarChart + AttributeHeatmap + HelpDot） | 大 | P0, P1, 5-A | 特大 |
| P5 | S4 + S5 テスト作成フロー統合（3 ページ → 1 ページ + モーダル） | 中 | P0, P1 | 中 |
| P6 | S8 テスト一覧改修（LedgerRow + サムネ仕様変更） | 中 | P0, P1 | 中 |
| P7 | 残画面（S1, S3, S10）のトークン適用 | 小 | P0, P1 | 小 |

---

## Testing Strategy

### Unit Tests
- 新規コンポーネント（RadarChart, AttributeHeatmap, HelpDot, SegmentControl, FieldSlider）の描画テスト
- EvaluationScores 5 軸化の型整合性テスト
- 設定 API のバックエンドハンドラーテスト

### Integration Tests
- ルーティング再編後の遷移テスト（リダイレクト含む）
- 設定モーダルの CRUD フロー
- S6 ペルソナ画面のタブ切替 + データ永続化

### E2E Tests
- テスト作成フロー（S4 → S5 モーダル → 実行）
- 結果レポート表示（S2 全セクション）
- 設定モーダルからのプロンプト編集 → テスト実行 → 結果確認
