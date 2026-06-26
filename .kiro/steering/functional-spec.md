# Chorus 機能仕様書

## アプリケーション概要

Chorus は AI ペルソナを使った Web デザインの A/B テストツール。ユーザーが 2 つのデザイン案をアップロードし、登録済みのペルソナ群に評価させることで、どちらのデザインが優れているかを多角的に分析する。

**技術スタック**: React 19 + Tailwind CSS v4 (SPA) / Hono (バックエンド) / DynamoDB / Amazon Bedrock

---

## 機能ドメイン

### 1. 認証

| 機能 | 説明 |
|---|---|
| サインイン | Cognito 認証。メール + パスワード |
| サインアウト | AccountMenu から実行 |
| ローカル開発認証 | `VITE_LOCAL_USER_ID` 設定時は認証スキップ |

---

### 2. ペルソナ管理

ペルソナは「デザインを評価する架空の人物像」。各ペルソナはタイプ・年齢・性別・職業・偏差値・年収・学歴・フリーテキスト（人物像）を持つ。

| 機能 | 説明 | API |
|---|---|---|
| ペルソナ一覧表示 | グリッド表示。検索・出自フィルタ付き | `GET /personas` |
| ペルソナ新規作成 | フォーム入力で作成。手動 or AI ドラフト | `POST /personas` |
| ペルソナ編集 | 属性の変更。`source=default` は編集不可 | `PUT /personas/:id` |
| ペルソナ削除 | 単体削除。`source=default` は削除不可 | `DELETE /personas/:id` |
| ペルソナ詳細表示 | 右カラムに属性サマリーを常時表示 | `GET /personas/:id` |
| AI ドラフト生成 | Bedrock でフリーテキストと推奨説明を自動生成 | `POST /personas/:id/draft` |
| アバターアップロード | Presigned URL で S3 に画像アップロード | `POST /personas/:id/upload-url` |
| インタビュー | ペルソナとしてチャット会話。デザインの感想を聞ける | `POST /personas/:id/interview` |
| デフォルトペルソナ | 初回ロード時に 20 体を自動シード。編集・削除不可 | 自動 |
| プロンプトプレビュー | 合成プロンプトの確認。折りたたみ式 | フロントのみ |

**ペルソナの出自 (source)**:
- `default` — 初期シードのプリセット。編集・削除不可
- `preset` — ユーザーがプリセットから追加
- `ai` — AI 生成
- `manual` — 手動作成

**ペルソナタイプ (7 種)**:
行動重視型、ビジュアル重視型、慎重型、トレンド敏感型、専門家型、コスト重視型、その他

---

### 3. A/B テスト

2 つのデザイン案をペルソナ群に評価させるテスト。

| 機能 | 説明 | API |
|---|---|---|
| テスト作成 | タイトル + デザイン A/B + 対象ペルソナを指定 | `POST /tests` |
| デザイン入力 (3 方式) | 画像アップロード / Figma URL / サイト URL | `POST /tests/:id/upload-url`, `POST /tests/:id/capture` |
| ペルソナ選択 | モーダルでチェックボックス式に選択 | フロントのみ |
| テスト実行 | 全ペルソナの評価を非同期バッチ実行 | `POST /tests/:id/execute` |
| 進捗モニタリング | 2 秒ポーリングで完了数・失敗数を監視 | `GET /tests/:id/progress` |
| テスト一覧 | 全テストをテーブル表示。ソート付き | `GET /tests` |
| テスト削除 | 単体削除・一括削除 | `DELETE /tests/:id` |
| テスト再実行 | 完了済みテストの再評価 | `POST /tests/:id/execute` |

**テストステータス**: `draft` → `running` → `completed` / `failed`

**デザイン入力方式**:
- `image_upload` — 画像ファイルを S3 にアップロード
- `figma_url` — Figma フレーム URL からスクリーンショット取得
- `site_url` — Web サイト URL から Playwright でスクリーンショット取得

---

### 4. 評価・分析

各ペルソナが Bedrock を通じてデザイン A/B を評価する。

| 機能 | 説明 |
|---|---|
| 5 軸評価 | usability（使いやすさ）、aesthetics（魅力）、clarity（分かりやすさ）、engagement（行動喚起）、trust（信頼感）の 5 軸で 0-100 点 |
| 勝者判定 | 各ペルソナが A / B / none（引分）を選択 |
| 信頼度 | 判定の確信度 0-100 |
| 評価理由 | 日本語の自由記述 |
| 理由要約 | 全ペルソナ完了後、Bedrock で A 支持理由・B 支持理由をまとめて生成 |

**評価プロンプト構造**:
1. ペルソナの人物像を設定
2. デザイン画像 A/B を提示
3. `evaluate_designs` ツールで構造化レスポンスを強制

---

### 5. 結果レポート

テスト完了後の分析レポート。

| 機能 | 説明 | API |
|---|---|---|
| 総合結果 | 勝者判定 + 3 セグメントバー（A/B/引分）+ 支持率テキスト | `GET /tests/:id/report` |
| デザイン比較 | A/B のサムネイル並列表示。勝者にアクセントバー | 同上 |
| 評価のまとめ | A 支持理由・B 評価点のリスト | 同上 |
| レーダーチャート | 5 軸の A/B 重畳レーダー（SVG） | 同上 |
| 属性別ヒートマップ | タイプ/性別/年齢層 × 5 軸の勝率グリッド。A/B トグル | 同上 |
| ペルソナ別テーブル | 各ペルソナの勝者・コメント・スコア。展開式 | 同上 |
| CSV エクスポート | 全評価結果の CSV ダウンロード | `GET /tests/:id/export` |
| HelpDot | 評価手法・データソース・属性分析の説明ポップオーバー | フロントのみ |

---

### 6. 設定

| 機能 | 説明 | API |
|---|---|---|
| Figma 連携 | Figma API トークンの保存・検証・解除 | `GET/PUT /api/settings`, `POST /figma/verify` |
| AI モデル | 使用する Bedrock モデルの選択 | `GET/PUT /api/settings` |
| プロンプト管理 | 4 テンプレート（ペルソナ評価・理由要約・インタビュー・AI 下書き）の追加指示編集 | `GET/PUT /api/settings` |
| 一般 | アプリ全般の設定（詳細未定） | `GET/PUT /api/settings` |

**永続化**: DynamoDB `PK: USER#<id>, SK: SETTINGS#<section>`

---

### 7. ナビゲーション

| 要素 | 説明 |
|---|---|
| サイドバー | 3 項目: ペルソナ / A/B テスト / 結果。折りたたみ対応 |
| AccountMenu | ユーザー名・ロール表示 + 設定・About・サインアウト |
| About モーダル | アプリ名・バージョン・ハッシュ表示 |
| 設定モーダル | AccountMenu から起動。4 セクションの左ナビ付き |

---

## データモデル

### Persona
| フィールド | 型 | 説明 |
|---|---|---|
| personaId | string | 一意 ID |
| displayName | string | 表示名（必須） |
| type | PersonaType | 行動タイプ（7 種） |
| source | string | 出自（default/preset/ai/manual） |
| age | number? | 年齢 |
| gender | string? | 性別 |
| occupation | string? | 職業 |
| deviationScore | number? | 偏差値 |
| annualIncome | string? | 年収 |
| education | string? | 学歴 |
| freeText | string? | 人物像フリーテキスト |
| avatarImageKey | string? | アバター画像キー |

### ABTest
| フィールド | 型 | 説明 |
|---|---|---|
| testId | string | 一意 ID |
| title | string | テスト名 |
| status | ABTestStatus | draft/running/completed/failed |
| designAImageKey | string? | デザイン A 画像キー |
| designBImageKey | string? | デザイン B 画像キー |
| designAInputType | string? | image_upload/figma_url/site_url |
| designBInputType | string? | 同上 |
| personaIds | string[] | 対象ペルソナ ID 群 |
| reasonSummaryA/B | string? | 理由要約キャッシュ |

### EvaluationScores
| フィールド | 型 | 説明 |
|---|---|---|
| usability | number | 使いやすさ (0-100) |
| aesthetics | number | 魅力 (0-100) |
| clarity | number | 分かりやすさ (0-100) |
| engagement | number | 行動喚起 (0-100) |
| trust | number | 信頼感 (0-100) |

### EvaluationResult
| フィールド | 型 | 説明 |
|---|---|---|
| personaId | string | 評価者ペルソナ ID |
| personaDisplayName | string | 評価者名 |
| winner | 'A' / 'B' / 'none' | 勝者判定 |
| confidence | number | 確信度 (0-100) |
| reason | string | 評価理由 |
| scoresA | EvaluationScores | A のスコア |
| scoresB | EvaluationScores | B のスコア |
| status | string | completed/failed |
