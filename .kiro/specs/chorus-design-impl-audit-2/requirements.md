# Requirements Document

## Introduction

Pencil デザイン（`design/pencil-new.pen`）に基づき、Chorus の現行 React/サーバーレス実装をダークテーマへ全面移行し、ルーティング再編・画面統合・新規コンポーネント追加・データモデル拡張を行う。差分台帳（カテゴリ 1〜5）に記載された全ギャップを解消する。

## Boundary Context

- **In scope**: Tailwind トークン基盤導入、全画面ダーク化、ルーティング再編、S2/S4/S6/S8/S9 画面改修、新規コンポーネント実装、EvaluationScores 5 軸化、設定 API 新設
- **Out of scope**: Pencil デザインファイルの変更、Cognito/CDK インフラ変更、E2E テスト自動化基盤の新規構築
- **Adjacent expectations**: `design/pencil-new.pen` を正とする。既存 API のレスポンス形式は後方互換を維持する

## Requirements

### Requirement 1: Tailwind トークン基盤の導入（P0）

**Objective:** As a フロントエンド開発者, I want カラー・フォント・spacing・角丸をデザイントークンとして一元管理したい, so that ダークテーマへの移行とスタイルの一貫性を確保できる

#### Acceptance Criteria

1. When フロントエンドをビルドした場合, the Chorus フロントエンド shall `index.css` の `@theme` ブロックでダーク値のカラートークン（`--color-bg-base`, `--color-bg-surface`, `--color-bg-raised`, `--color-hairline`, `--color-text-hi`, `--color-text-mid`, `--color-text-lo`, `--color-accent`, `--color-accent-dim`, `--color-win-a`, `--color-win-b`, `--color-win-b-dim`, `--color-danger`, `--color-danger-dim`, `--color-success`, `--color-success-dim`, `--color-draw`）を CSS カスタムプロパティとして定義する
2. The Chorus フロントエンド shall フォントトークン（`--font-sans: 'Geist', sans-serif`, `--font-mono: 'Geist Mono', monospace`）を `@theme` ブロックで定義する
3. The Chorus フロントエンド shall spacing トークン（`--spacing-1` 〜 `--spacing-7`: 4px 刻み）、角丸トークン（`--radius-sm: 6px`, `--radius-md: 10px`, `--radius-lg: 14px`）、タイポグラフィサイズトークン（`--text-xs: 11px`, `--text-sm: 13px`, `--text-base: 14px`, `--text-lg: 18px`, `--text-xl: 24px`, `--text-display: 40px`）を定義する
4. When Tailwind ユーティリティクラスを使用した場合, the Chorus フロントエンド shall `bg-base`, `text-hi`, `font-sans` 等のユーティリティでトークン値を参照できる

### Requirement 2: AppLayout ダーク化とルーティング再編（P1）

**Objective:** As a ユーザー, I want ダークテーマの統一されたナビゲーションでアプリを操作したい, so that デザイン通りの体験が得られる

#### Acceptance Criteria

1. The Chorus フロントエンド shall Sidebar・SidebarCollapsed・AccountMenu をダークトークン（`$bg-surface`, `$text-hi`, `$hairline`）で描画する
2. The Chorus フロントエンド shall ナビ項目を「ペルソナ」「A|Bテスト」「結果」の 3 項目に変更し、「ダッシュボード」を除外する
3. When ユーザーが `/` または `/dashboard` にアクセスした場合, the Chorus フロントエンド shall `/personas` へリダイレクトする
4. The Chorus フロントエンド shall `/settings` ルートを削除し、設定は AccountMenu からのモーダル起動に変更する
5. The Chorus フロントエンド shall `/tests/new/personas` と `/tests/new/confirm` ルートを廃止する
6. When AboutModal を表示した場合, the Chorus フロントエンド shall ダークトークン（`$bg-surface`）で描画する

### Requirement 3: S6 統合ペルソナ画面（P2）

**Objective:** As a ユーザー, I want ペルソナの編集とインタビューを 1 つの画面でタブ切替して操作したい, so that ページ遷移なしにペルソナを管理できる

#### Acceptance Criteria

1. The Chorus フロントエンド shall PersonaEditPage と PersonaDetailPage を 1 ページに統合し、「編集」「インタビュー」の 2 タブで構成する
2. When 「編集」タブがアクティブな場合, the Chorus フロントエンド shall タブ下線を `$accent` で表示する
3. The Chorus フロントエンド shall 右カラムに PersonaNode identicon・表示名・タイプ・人物像を常時表示する
4. The Chorus フロントエンド shall 年齢・偏差値入力に FieldSlider コンポーネント、性別入力に SegmentControl コンポーネントを使用する
5. The Chorus フロントエンド shall sticky フッター（削除=danger / キャンセル / 保存）を画面下部に固定表示する
6. When 「インタビュー」タブがアクティブな場合, the Chorus フロントエンド shall ChatBubble コンポーネントでチャット UI を描画する
7. The Chorus フロントエンド shall PersonaNode identicon を seed ベースの決定論的生成で描画し、GeneratedAvatar を廃止する
8. The Chorus フロントエンド shall 編集タブに合成プロンプトの折りたたみ式プレビューを表示し、現在のペルソナ設定から生成されるプロンプト全文を確認できる導線を提供する

### Requirement 4: S9 設定モーダル（P3）

**Objective:** As a ユーザー, I want 任意の画面から設定モーダルを開き、Figma 連携・AI モデル・プロンプトを管理したい, so that ページ遷移なしに設定変更できる

#### Acceptance Criteria

1. The Chorus フロントエンド shall SettingsPage（フルページ）をグローバルモーダル（オーバーレイ）に変更する
2. The Chorus フロントエンド shall 設定モーダルに左ナビ付き 4 セクション（一般・Figma 連携・AI モデル・プロンプト）を実装する
3. The Chorus フロントエンド shall プロンプトセクションに 4 テンプレート（ペルソナ評価・理由要約・インタビュー・AI 下書き）の一覧を表示し、テンプレート選択時はモーダル内でドリルイン遷移（戻る矢印＋コンテンツ差し替え。モーダル on モーダルではない）で詳細画面を表示する。詳細画面は「固定コンテキスト（読み取り専用）」「固定指示（読み取り専用）」「追加指示（編集可能）」の 3 区分で構成する
4. When AccountMenu の「設定」をクリックした場合, the Chorus フロントエンド shall 設定モーダルを表示する
5. The Chorus バックエンド shall `GET /api/settings` と `PUT /api/settings` エンドポイントを新設し、DynamoDB にユーザー設定を永続化する（`PK: USER#<id>, SK: SETTINGS#<section>`）

### Requirement 5: S2 結果レポート拡張（P4）

**Objective:** As a ユーザー, I want 5 軸レーダーチャート・属性別ヒートマップ・評価手法の説明付きで結果を確認したい, so that より深い分析と信頼性のある評価結果を得られる

#### Acceptance Criteria

1. The Chorus バックエンド shall EvaluationScores に `trust` 軸を追加し、5 軸（usability, aesthetics, clarity, engagement, trust）で評価する
2. While 既存テストデータに `trust` が未定義の場合, the Chorus フロントエンド shall 当該軸を 0 または N/A として表示する
3. The Chorus フロントエンド shall 総合結果を 3 セグメントバー（A/B/引分）+ 判定テキスト +「N人中M人がAを支持」で表示し、DonutChart と `🏆 WINNER` を廃止する
4. The Chorus フロントエンド shall 5 軸 RadarChart コンポーネント（SVG）を実装し結果レポートに表示する
5. The Chorus フロントエンド shall AttributeHeatmap コンポーネント（タイプ/性別/年齢軸 × 5 軸グリッド + A/B トグル）を実装し、既存のレポート API から取得した evaluations + personas データをフロントエンドで集計して表示する
6. The Chorus フロントエンド shall HelpDot コンポーネントと 3 種の Popover（MethodPopover / SourcePopover / AttributePopover）を実装する
7. The Chorus フロントエンド shall DesignCard から全周ボーダーと Trophy バッジを除去し、勝者 A 側にアクセントバー（左 2px `$win-a`）のみを表示し、B 側は枠・fill・装飾なし（bg-base に直置き）とする

### Requirement 6: S4+S5 テスト作成フロー統合（P5）

**Objective:** As a ユーザー, I want テスト作成を 1 ページで完結させたい, so that ステッパーによるページ遷移なしにテストを作成・実行できる

#### Acceptance Criteria

1. The Chorus フロントエンド shall TestInputPage・TestPersonaSelectPage・TestConfirmPage の 3 ページフローを 1 ページ（TestInputPage）に統合する
2. When ペルソナ選択ボタンをクリックした場合, the Chorus フロントエンド shall S5 モーダル（オーバーレイ）でペルソナ選択 UI を表示する
3. The Chorus フロントエンド shall 確認画面を廃止し、「作成して実行」ボタンで直接テストを作成・実行する
4. The Chorus フロントエンド shall Stepper コンポーネントを廃止する

### Requirement 7: S8 テスト一覧改修（P6）

**Objective:** As a ユーザー, I want テスト一覧で勝者デザインのサムネイルとステータスを一目で確認したい, so that テスト結果を素早く把握できる

#### Acceptance Criteria

1. The Chorus フロントエンド shall ABTestTable を LedgerRow コンポーネント（チェック + サムネ + テスト名 + ペルソナ数 + ステータス + 日時）に置換する
2. The Chorus フロントエンド shall サムネイルに勝者デザイン画像 1 枚を表示する（DRAW → A案、未完了 → A案）
3. The Chorus フロントエンド shall 列順をチェックボックス/プレビュー/テスト名/ペルソナ/ステータス/日付に変更する
4. When 一括削除モードで行を選択した場合, the Chorus フロントエンド shall 選択行を `$accent-dim` でハイライトする

### Requirement 8: 残画面のダークトークン適用（P7）

**Objective:** As a ユーザー, I want 全画面で統一されたダークテーマを体験したい, so that 画面間のビジュアル不整合がない

#### Acceptance Criteria

1. The Chorus フロントエンド shall S1（PersonaListPage）のインラインスタイルをダークトークンの Tailwind ユーティリティに置換する
2. The Chorus フロントエンド shall S3（TestRunningPage）のインラインスタイルをダークトークンの Tailwind ユーティリティに置換する
3. The Chorus フロントエンド shall S10（AboutModal）の背景色を `$bg-surface` トークンに置換する

## Requirements
<!-- Requirements are defined above -->
