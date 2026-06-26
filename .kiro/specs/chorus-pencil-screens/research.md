# Research & Design Decisions

## Summary
- **Feature**: `chorus-pencil-screens`
- **Discovery Scope**: Extension（既存 `design/pencil-new.pen` のデザインシステムを拡張）
- **Key Findings**:
  - 既存 `pencil-new.pen` に確定トークン（無彩3階層 + accent + セマンティック + `space-*` / `text-*` / `p-*`）と reusable component（`PersonaNode`=CtjwC, `PersonaCard`=MrWyv）が定義済み。新画面はこれを再利用する。
  - 現行 React アプリの型（`Persona`, `ABTest`, `ConversationMessage`, `PersonaDraft`）が、各画面が表示すべきデータ構造の正となる。デザインはこの形にバインドする。
  - Pencil MCP のレンダリングキャッシュ不具合（大量ノード生成直後に親フレーム全景スクショが黒化）が再現。データ自体は正常で、葉ノード個別スクショ・`snapshot_layout` で検証可能。実装フェーズの検証手順に織り込む。

## Research Log

### 既存 pencil-new.pen の構造把握
- **Context**: 新画面を既存デザインシステムと矛盾なく追加するため、既存トークン・コンポーネント・画面を把握する必要があった。
- **Sources Consulted**: Pencil MCP `get_editor_state` / `get_variables` / `batch_get`、memory `chorus-dark-redesign`、`CLAUDE.md` Design Policy。
- **Findings**:
  - 確定済みトークン: 地 `bg-base/bg-surface/bg-raised`、文字 `text-hi/mid/lo`、`accent`=win-a `#6E78D9`、win-b `#C9974F`、`space-1..7`(4/8グリッド)、`text-xs..display`、ペルソナ family `p-haruto..p-rina` + 追加 `p-yoshiko/p-takuya/p-nao`。
  - reusable component: `PersonaNode`(発光identiconタイル, identicon.js)、`PersonaCard`(人格ヒーロー + 属性脚注)。
  - 既存画面: S1 ペルソナ管理(JAyqO)、S2 結果レポート(KDgO1)、S3 実行中(OSMxe)、S4 新規テスト(AnX1d)、S5 ペルソナ選択モーダル(o3pQ3)。
- **Implications**: 新画面は新トークンをほぼ追加せず既存を参照する。`PersonaNode` を作成/編集プレビュー・詳細・インタビューで再利用する。

### 現行アプリの情報設計の参照
- **Context**: 各新画面が表示すべき情報項目を、現行 React アプリ（ライト版）の実機ウォークスルーで確定した。
- **Sources Consulted**: Playwright で `localhost:5175` を巡回（dashboard/personas/personas/new/personas/:id/results/settings）、`packages/frontend/src/types/index.ts`。
- **Findings**:
  - ペルソナ作成: 基本情報(表示名/タイプ/アバター) + 属性6種(年齢/性別/偏差値/年収/学歴/職業) + 自由記述 + AIアシスト下書き + ライブプレビュー。
  - ペルソナ詳細: 左に属性スペック、右に AIインタビュー(チャット, `ConversationMessage[]`)。
  - テスト一覧: テスト名 + A/Bプレビュー + ペルソナ数 + ステータス(`ABTestStatus`) + 日時 + 一括削除。
  - 設定: Figma 連携トークン(接続状態 + マスク入力 + 更新 + 取得手順)。
  - About: アカウントメニュー内モーダル(ロゴ + アプリ名 + タグライン + バージョン)。
- **Implications**: データモデルは現行型をそのまま使用。デザインは「属性スペックDB」ではなく「人格ヒーロー + 属性脚注」の Chorus 世界観に再構成する（Req 4）。

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| トークン→コンポーネント→画面の3層 | Pencil variables を基盤に reusable component を組み、画面 frame で instance 配置 | 値の一貫性、編集の波及、脱・箱規律を仕組みで担保 | コンポーネント粒度の取りすぎは過剰抽象 | 既存 pencil-new.pen が既にこの構造。踏襲する |
| 画面ごとに個別作り込み | 各 screen frame に直接ノードを構築 | 初速が速い | 重複・ドリフト、トークン逸脱が起きやすい | S2 初版で箱の乱立を招いた反省。不採用 |

## Design Decisions

### Decision: 共通シェル（Sidebar）を reusable component 化する
- **Context**: S1〜S5 では各画面にサイドバーを複製しており、nav 構成変更（ダッシュ外し・ラベル統一）が全画面同時修正を要する。
- **Alternatives Considered**:
  1. 現状維持（各画面に複製） — 変更が全画面手作業。
  2. `AppShell`/`Sidebar` を reusable component 化 — 1箇所修正で全画面波及。
- **Selected Approach**: `Sidebar` を reusable component にし、各画面は instance 配置 + アクティブ nav の descendant override のみ行う。
- **Rationale**: nav 統一（Req 3）と将来の項目変更コストを下げる。脱・箱と無関係に構造的利点が大きい。
- **Trade-offs**: 既存 S1〜S5 のサイドバーを instance へ差し替える移行作業が必要。
- **Follow-up**: 既存5画面のサイドバー置換をタスク化。アクティブ状態の override slot を明確化。

### Decision: 作成/編集のアバターは発光アバター（identicon）に限定
- **Context**: 現行は写真アップロードUIだが、Chorus 世界観は発光ノードで人格を識別する。
- **Alternatives Considered**:
  1. 写真アップロード踏襲 — パレット外の任意画像が混入し世界観が濁る。
  2. 発光アバター（PersonaNode, seed=表示名） — 世界観統一、決定論プレビュー。
- **Selected Approach**: アバターは `PersonaNode`(identicon, seed=表示名) を使用し、表示名入力に追従してプレビュー更新（Req 5.4、ユーザー確定）。
- **Rationale**: 「発光は人格のみ」規律と一致。avatarImageKey は当面デザイン上不使用。
- **Trade-offs**: 現行の写真アップロード機能とはデザイン上乖離（実装スコープ外なので許容）。
- **Follow-up**: なし。

## Risks & Mitigations
- Pencil レンダリングキャッシュ不具合で全景スクショが黒化 — **フォールバック禁止**。葉ノード個別スクショで「正常」と判断して進めず、全景が正常描画されるまでユーザーに再接続を依頼して待つ（エディタ側でも崩れている可能性があるため）。`snapshot_layout` は補助的な構造確認にのみ使う。
- サイドバー component 化で既存5画面に回帰リスク — 置換後に各画面スクショ自己批評で確認。
- 新画面で「箱の乱立」に逆戻りするリスク — 各画面完成時に CLAUDE.md の脱・箱チェックを必須化。

## References
- `CLAUDE.md` 「Design Policy — Chorus UI」 — 脱・箱/発光規律/トークンの規範
- memory `chorus-dark-redesign` — 確定トークン・既存画面ID・進捗
- memory `chorus-persona-data-model` — 表示名+属性の表示モデル、多人数サマリー方針
- `packages/frontend/src/types/index.ts` — Persona / ABTest / ConversationMessage 型
