# Research & Design Decisions

## Summary
- **Feature**: `chorus-design-impl-audit-2`
- **Discovery Scope**: Extension（既存システムの大規模改修）
- **Key Findings**:
  - インラインスタイル 430 箇所・ハードコード色値 410 箇所が Tailwind トークンへの移行対象
  - `components/ui/` ディレクトリは空で、共通 UI コンポーネント基盤が未整備
  - フロントエンド/バックエンドで型定義が重複しており、EvaluationScores 5 軸化は両方で変更が必要

## Research Log

### Tailwind CSS v4 @theme ブロック
- **Context**: 現行 `index.css` は `@import "tailwindcss"` と keyframes のみ。ダークトークンの導入方式を決定する必要がある
- **Findings**:
  - Tailwind v4 は `@theme` ブロックで CSS カスタムプロパティを定義し、自動的にユーティリティクラスを生成する
  - `--color-*` プレフィックスで定義すれば `bg-*`, `text-*`, `border-*` 等のユーティリティが使える
  - ダーク値をデフォルトとし `prefers-color-scheme` は使用しない（シングルテーマ運用）
- **Implications**: `@theme` に全トークンを定義し、段階的にインラインスタイルを置換する

### Pencil デザイントークンの実測値（get_variables 取得）
- **Context**: design.md の @theme 値がデザインファイルと一致している必要がある
- **Sources Consulted**: `mcp__pencil__get_variables` で `design/pencil-new.pen` から取得
- **Findings**:
  - `bg-base: #0A0B0D`, `bg-surface: #131517`, `bg-raised: #1C1F23`
  - `hairline: #FFFFFF14`（アルファ付き白、不透明灰色ではない）
  - `accent: #6E78D9`（青紫系）、`win-a: #6E78D9`（accent と同値）、`win-b: #C9974F`（金系）
  - `text-hi: #F2F4F7`, `text-mid: #9BA1AC`, `text-lo: #5B616B`
  - `danger: #E06A6A`, `success: #54B587`
  - `r-lg: 14`（16 ではない）
  - spacing: `space-1`〜`space-7`（`space-8` は存在しない）
  - ペルソナ固有色: `p-aya`, `p-haruto` 等 9 名分（PersonaNode identicon 用）
  - `draw` トークンは Pencil 変数に未定義 → audit-1 の WinDonut 参照で `#3A3D42` を採用
- **Implications**: design.md の @theme ブロックを実測値で修正済み

### DynamoDB 設定データ永続化パターン
- **Context**: S9 設定モーダルのバックエンド永続化が必要
- **Findings**:
  - 既存シングルテーブル設計に `SETTINGS#` SK プレフィックスを追加する
  - 設定は低頻度更新のため PutItem/GetItem で十分（Query 不要）
  - Figma トークンは `localStorage` から DynamoDB へ移行
- **Implications**: `PK: USER#<id>, SK: SETTINGS#<section>` パターンで統一

### RadarChart 実装方式
- **Context**: 5 軸レーダーチャートをゼロから実装する必要がある
- **Findings**:
  - `design/radar.js` に Canvas ベースの参考実装が存在するが React 化が必要
  - 外部ライブラリ不使用方針（recharts 等を入れない）→ SVG で自前実装
  - 5 角形の頂点座標計算は三角関数のみで実現可能
- **Implications**: SVG ベースの React コンポーネントとして実装。Canvas 版は参考のみ

## Design Decisions

### Decision: インラインスタイル移行の段階戦略
- **Context**: 430 箇所のインラインスタイルを一括移行すると差分が巨大になる
- **Alternatives Considered**:
  1. 全ファイル一括移行 — 一貫性は高いがレビュー困難
  2. 画面単位で段階移行 — P0 でトークン定義、P1〜P7 で画面ごとに適用
- **Selected Approach**: 画面単位の段階移行（P0〜P7）
- **Rationale**: 差分台帳の優先順序と一致し、各 PR が自己完結する
- **Trade-offs**: 移行期間中にトークンとインラインスタイルが混在する

### Decision: AttributeHeatmap 集計をフロントエンドで実行
- **Context**: ペルソナ属性 × 評価軸のクロス集計が必要
- **Alternatives Considered**:
  1. バックエンド集計 API 新設
  2. フロントエンドで既存データから算出
- **Selected Approach**: フロントエンドで算出
- **Rationale**: evaluations + personas データは既にレポート API で取得済み。新規 API 不要でバックエンド変更を最小化
- **Trade-offs**: ペルソナ数が極端に多い場合の計算コスト（現実的には 20 人以下なので問題なし）

## Risks & Mitigations
- インラインスタイル移行漏れ → 各 PR で `grep` による残存チェックを実施
- EvaluationScores 5 軸化の後方互換 → `trust` 未定義は 0/N/A 表示にフォールバック
- S9 設定モーダルの状態管理 → AppLayout レベルで `useState` で開閉管理（グローバル状態管理は導入しない）
