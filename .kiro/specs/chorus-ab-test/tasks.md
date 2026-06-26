# Implementation Plan

## Task 0: ローカル開発環境

- [x] 0. ローカル開発環境を構築する

- [x] 0.1 pnpm ワークスペースと TypeScript 基盤を初期化する
  - `packages/frontend`、`packages/backend`、`packages/infra` の 3 パッケージ構造を pnpm ワークスペースで初期化する
  - 各パッケージの TypeScript 設定（tsconfig.json）とパッケージ定義（package.json）を整える
  - `pnpm install` でワークスペース全体の依存が解決でき、`pnpm -r build` が成功する
  - _Requirements: 9.1_

- [x] 0.2 DynamoDB Local を Docker Compose で構築する
  - `docker-compose.yml` に `amazon/dynamodb-local` を定義し、ポート 8000 で起動する
  - `chorus-main` テーブル（PK + SK 複合キー）をローカルに作成する初期化スクリプト（`scripts/init-local-db.ts`）を実装する
  - AWS SDK の `endpoint` を `http://localhost:8000` に向ける環境変数（`.env.local`）を追加する
  - `docker compose up -d` → `pnpm db:init` でローカルテーブルが作成され、テーブル一覧に `chorus-main` が表示される
  - _Requirements: 8.1_

- [x] 0.3 Lambda ハンドラーをローカルで動かす Hono 開発サーバーを構築する
  - `packages/backend/src/dev-server.ts` に Hono を使ったローカル HTTP サーバーを実装する
  - API Gateway Lambda Proxy イベント形式に変換するアダプターを用意し、各 Lambda ハンドラーを Hono ルートにマッピングする
  - Cognito JWT 検証をスキップするローカル用モック認証ミドルウェア（`x-local-user-id` ヘッダーから `userId` を取得）を実装する
  - `pnpm dev:backend` でローカルサーバーが起動し、`curl -H "x-local-user-id: test-user" http://localhost:3001/personas` が空配列を返す
  - _Requirements: 9.1_

- [x] 0.4 Vitest を設定し DynamoDB Local 接続テストを追加する
  - `packages/backend` に Vitest を設定し、`pnpm test` でテストが実行できるようにする
  - DynamoDB Local へ接続するテスト用ヘルパー（テーブル作成・クリーンアップ）を `packages/backend/test/helpers/dynamo.ts` に実装する
  - `shared/dynamo.ts` のキー補完ヘルパーの単体テストを作成して pass させる
  - `pnpm test` で全テストが pass し、DynamoDB Local への接続テストが成功する
  - _Requirements: 8.2_

---

## Task 1: Foundation — CDK インフラ・共有ユーティリティ

- [ ] 1. Foundation: CDK インフラと共有ユーティリティを構築する

- [ ] 1.1 モノレポ構造と開発環境を初期化する
  - `packages/frontend`、`packages/backend`、`packages/infra` の 3 パッケージ構造を pnpm ワークスペースで初期化
  - 各パッケージの TypeScript 設定（tsconfig.json）とパッケージ定義（package.json）を整える
  - esbuild による Lambda バンドル設定を infra パッケージに追加する
  - `pnpm install` でワークスペース全体の依存が解決でき、`pnpm build` が成功する
  - _Requirements: 9.1_

- [ ] 1.2 DynamoDB 単一テーブルと S3 バケットを CDK で定義する
  - `chorus-main` テーブルを PAY_PER_REQUEST・PK+SK 複合キーでStorage Construct に定義する
  - デザイン画像保管用 S3 バケットを CloudFront OAC 付きで定義する
  - 本番 SPA 配信用 S3 バケット＋CloudFront ディストリビューションを定義する
  - `cdk synth` が成功し、テーブル・バケット・ディストリビューションのリソース定義が出力される
  - _Requirements: 8.1, 8.4_
  - _Boundary: Storage Construct_

- [ ] 1.3 Cognito User Pool を CDK で定義する
  - User Pool と App Client（PKCE フロー設定）を Auth Construct に定義する
  - Identity Provider フェデレーション設定のプレースホルダを用意して SSO 追加に備える
  - CDK Output に User Pool ID と Client ID を出力し、フロントエンド設定から参照できるようにする
  - `cdk synth` で Cognito リソースが出力され、フロントエンドの Amplify 設定に使える値が確認できる
  - _Requirements: 1.1, 1.3, 1.4_
  - _Boundary: Auth Construct_

- [ ] 1.4 API Gateway HTTP API と Lambda 共通設定を CDK で定義する
  - HTTP API v2 を Cognito JWT Authorizer 付きで API Construct に定義する
  - 各 Lambda の共通環境変数（`TABLE_NAME`, `IMAGE_BUCKET`, `BEDROCK_MODEL_ID`）を CDK で注入する
  - `BEDROCK_MODEL_ID` のデフォルト値を `amazon.nova-lite-v1:0` に設定する
  - API Gateway の CORS 設定に Cloudflare Pages ドメインと本番ドメインを許可オリジンとして追加する
  - `cdk synth` でルート定義・オーソライザー・CORS 設定が確認できる
  - _Requirements: 1.3, 8.3, 9.1_
  - _Boundary: API Construct_

- [x] 1.5 バックエンド共有ユーティリティを実装する
  - DynamoDB DocumentClient ラッパー（`PK=TYPE#id` 補完ヘルパー含む）を `shared/dynamo.ts` に実装する
  - API Gateway JWT claims から `userId`（sub）を取得するユーティリティを `shared/auth.ts` に実装する
  - `AppError` 型と HTTP エラーレスポンス生成関数を `shared/errors.ts` に定義する
  - ユーティリティ関数の単体テストが pass し、DynamoDB クエリヘルパーが正しいキー補完をすることを確認できる
  - _Requirements: 8.2, 8.3_
  - _Boundary: Backend Shared_

---

## Task 2: バックエンド — ペルソナ・インタビュー・A/B テストサービス

- [ ] 2. バックエンド: ドメインサービスを実装する

- [x] 2.1 ペルソナ CRUD サービスを実装する
  - `GET /personas`、`POST /personas`、`GET /personas/{id}`、`PUT /personas/{id}`、`DELETE /personas/{id}` を実装する
  - `PK=USER#sub`、`SK=PERSONA#id` のキースキーマで DynamoDB に保存・取得する
  - `displayName` 未入力時に 400、他ユーザーのペルソナアクセス時に 404 を返す
  - CRUD の各エンドポイントが正しいステータスコードとレスポンスボディを返すことを確認できる
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6_
  - _Boundary: Persona Service Lambda_

- [ ] 2.2 ペルソナ AI アシスト下書き生成を実装する
  - `POST /personas/{id}/draft` エンドポイントを実装する
  - ペルソナ属性を `BEDROCK_MODEL_ID` のモデルに Bedrock Converse で送信し、自由記述の下書きを生成する
  - Bedrock 呼び出し失敗時は 503 を返し、ペルソナ CRUD をブロックしない
  - 下書き生成リクエストに対して `freeText` と `suggestedDescription` を含むレスポンスが返る
  - _Requirements: 2.5_
  - _Boundary: Persona Service Lambda_

- [ ] 2.3 (P) ペルソナインタビューサービスを実装する
  - `POST /personas/{id}/interview` エンドポイントを実装する
  - リクエストの `messages` 配列をペルソナ設定のシステムプロンプトと組み合わせて Bedrock へ送信する（ステートレス）
  - Bedrock ConverseStream でストリーミングレスポンスを返す
  - ストリーミングで回答が届き、生成中であることをクライアントが判定できる
  - 失敗時にエラーレスポンスを返して再試行を可能にする
  - _Requirements: 3.1, 3.2, 3.3_
  - _Boundary: Interview Service Lambda_

- [ ] 2.4 (P) A/B テスト管理サービスを実装する
  - `POST /tests`、`GET /tests`、`GET /tests/{id}`、`PUT /tests/{id}` を実装する
  - `POST /tests/{id}/upload-url` で S3 Presigned PUT URL（有効期限 15 分）を生成して返す
  - `GET /tests/{id}/progress` で ABTest の `status`・完了数・失敗数を返す
  - A案/B案未設定またはペルソナ未選択での execute 要求時に 400 を返す
  - Presigned URL 経由で S3 に画像をアップロードし、テスト詳細取得で imageKey が確認できる
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 9.2_
  - _Boundary: ABTest Service Lambda_

---

## Task 3: バックエンド — 評価オーケストレーター

- [ ] 3. バックエンド: 評価オーケストレーターを実装する

- [ ] 3.1 AI 評価オーケストレーターを実装する
  - `POST /tests/{id}/execute` で ABTest.status を RUNNING に更新し、並列評価を非同期で開始する
  - `personaIds` を 25 本ずつバッチに分割して `Promise.allSettled` で Bedrock Converse を並列実行する
  - `evaluate_designs` ツールを `toolChoice` で強制呼び出しして構造化 JSON（勝者・理由・スコア）を取得する
  - 各ペルソナの結果を `PK=ABTEST#id, SK=EVAL#personaId` で DynamoDB に保存する（失敗時は `status=FAILED`）
  - 全ペルソナ完了後に ABTest.status を COMPLETED に更新する
  - Bedrock throttling（429）発生時は最大 3 回 exponential backoff で再試行する
  - 100 ペルソナ分の評価が Lambda タイムアウト（15 分）内に完了し、DynamoDB に全結果が保存される
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 9.3, 9.4_
  - _Boundary: Evaluation Orchestrator Lambda_
  - _Depends: 2.1, 2.4_

---

## Task 4: バックエンド — レポートサービス

- [ ] 4. バックエンド: レポートサービスを実装する

- [ ] 4.1 結果レポート集計サービスを実装する
  - `GET /tests/{id}/report` で Evaluation レコードを集計し、勝者・支持率・ペルソナ別スコアを返す
  - 支持率（`supportRateA/B`）と総合勝者を `winner` カウントから算出する
  - `GET /tests/{id}/export` で評価結果を CSV 形式で出力する
  - `GET /tests` でサインイン中ユーザーのテスト一覧（ダッシュボード用）を返す
  - レポート・エクスポート・一覧の 3 エンドポイントすべてが正しいレスポンスを返すことを確認できる
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2_
  - _Boundary: Report Service Lambda_
  - _Depends: 3.1_

---

## Task 5: フロントエンド — プロジェクト基盤・認証 (P)

- [ ] 5. (P) フロントエンド: 基盤と認証を構築する
  - _Depends: 1.3, 1.4_

- [ ] 5.1 フロントエンドプロジェクトと Cloudflare Pages 設定を構築する
  - Vite + React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui を `packages/frontend` に初期化する
  - React Router v6 でルート定義（S0〜S6 の全画面パスを仮ページで登録する）
  - `@aws-amplify/auth` v6 を設定して CDK Output の Cognito User Pool ID・Client ID と接続する
  - Cloudflare Pages のビルド設定（ビルドコマンド・出力ディレクトリ・環境変数）をリポジトリに追加する
  - `pnpm dev` でローカルサーバーが起動し、`develop` ブランチへの push で Cloudflare Pages に自動デプロイされる
  - _Requirements: 9.1_
  - _Boundary: Frontend_

- [ ] 5.2 サインイン画面と AuthGuard を実装する
  - サインイン画面（S0）を shadcn/ui でカスタム実装する（メール・パスワード入力、エラー表示）
  - Amplify `signIn` でサインインし、成功時にダッシュボードへ遷移する
  - 未認証ユーザーを保護ルートからサインイン画面へリダイレクトする AuthGuard を React Router で実装する
  - Amplify `signOut` でセッションを破棄し、以降の保護リソースアクセスを拒否する
  - 有効な認証情報でサインインするとダッシュボードへ遷移し、無効な場合は画面にエラーが表示される
  - _Requirements: 1.1, 1.2, 1.3, 1.5_
  - _Boundary: Frontend Auth_

---

## Task 6: フロントエンド — ペルソナ・ダッシュボード画面

- [ ] 6. フロントエンド: ペルソナ関連画面を実装する

- [ ] 6.1 ダッシュボード画面を実装する
  - S1 ダッシュボードにテスト一覧（タイトル・ステータス・日付）をカード形式で表示する
  - 各テストをクリックすると結果レポートまたは進捗画面へ遷移する
  - テスト一覧が空の場合に「テストを作成する」へ誘導する EmptyState を表示する
  - ダッシュボードを開いたときにテスト一覧が表示され、各テストへのナビゲーションが機能する
  - _Requirements: 7.1, 7.2_
  - _Boundary: Frontend Dashboard_

- [ ] 6.2 (P) ペルソナ一覧・編集画面を実装する
  - S2 ペルソナ一覧（PersonaCard グリッド）と S2b ペルソナ編集フォームを実装する
  - フォームで表示名・タイプ・年齢・職業などの属性を入力して保存・編集・削除できる
  - 「AI アシスト」ボタンで下書きを生成してフォームの自由記述欄に反映する
  - `displayName` 未入力時にフォームバリデーションエラーが表示される
  - ペルソナを保存すると一覧に反映され、編集・削除が正常に機能する
  - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6_
  - _Boundary: Frontend Persona_

- [ ] 6.3 (P) ペルソナ詳細・インタビュー画面を実装する
  - S2c ペルソナ詳細とインタビューチャット UI を実装する
  - メッセージ送信後にストリーミングレスポンスを順次チャット欄に表示する
  - 回答生成中のインジケーターと失敗時の再試行ボタンを実装する
  - ペルソナへのメッセージ送信後、ストリーミングで回答が表示され生成中であることが分かる
  - _Requirements: 3.1, 3.2, 3.3_
  - _Boundary: Frontend Interview_

---

## Task 7: フロントエンド — A/B テスト・レポート画面 (P)

- [ ] 7. (P) フロントエンド: A/B テスト・レポート画面を実装する

- [ ] 7.1 テスト作成フロー画面を実装する
  - S3-1 入力画面（A/B 画像アップロード）、S3-2 ペルソナ選択、S3-3 確認画面を実装する
  - DesignUploader でファイル選択 → Presigned URL 取得 → S3 直接 PUT → プレビュー表示の流れを実装する
  - S3-2 のペルソナ選択チェックボックスで対象ペルソナを選択し、S3-3 確認画面に選択人数を表示する
  - A/B 両方の画像アップロード後にプレビューが表示され、確認画面で「テスト実行」ボタンが活性化する
  - _Requirements: 4.1, 4.2, 4.7, 4.8_
  - _Boundary: Frontend ABTest_

- [ ] 7.2 (P) テスト実行中・進捗画面を実装する
  - S4 実行中画面で 3 秒間隔のポーリングにより完了数・失敗数と進捗バーを更新する
  - `status === "completed"` を検知したら自動でレポート画面へ遷移する
  - テスト実行が完了すると自動的にレポート画面へ遷移し、実行中も UI がブロックされない
  - _Requirements: 5.3, 6.5, 9.3_
  - _Boundary: Frontend Evaluation_

- [ ] 7.3 (P) 結果レポート画面を実装する
  - S5 結果レポートに勝者バッジ・支持率ドーナツチャート・評価軸スコア比較・ペルソナ別テーブルを表示する
  - PersonaTable はペルソナ数に関わらずスクロール可能なテーブルとしてレイアウト崩れを防ぐ
  - エクスポートボタンで CSV ダウンロード、再実行ボタンで同一条件のテストを再開始する
  - レポート画面を開いたとき、勝者・支持率・スコア・ペルソナ表の全セクションが表示される
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 9.5_
  - _Boundary: Frontend Report_

---

## Task 8: 統合 — API 接続とスモークテスト

- [ ] 8. 統合: フロントエンドとバックエンドを接続する

- [ ] 8.1 フロントエンドの API クライアントを実装して全エンドポイントを接続する
  - `packages/frontend/src/api/` に fetch ラッパーを実装し、全リクエストに Cognito Access Token を付与する
  - 各画面・フックが対応するバックエンド API を呼び出し、レスポンスを React 状態管理に反映する
  - エラーレスポンス（400, 401, 404, 409, 503）をユーザー向けのメッセージとして画面に表示する
  - サインイン → ペルソナ作成 → テスト作成 → 評価実行 → レポート表示の一連のフローが Cloudflare Pages 開発環境で動作する
  - _Requirements: 1.1, 4.6, 8.2_
  - _Depends: 4.1, 7.3_

- [ ] 8.2 本番 CDK デプロイと E2E スモークテストを実施する
  - 対象リージョンで Bedrock の `amazon.nova-lite-v1:0` モデルアクセスを有効化する
  - `cdk deploy` で全スタックをデプロイし、CloudFront URL で本番 SPA にアクセスできることを確認する
  - 画像アップロード → AI 評価実行 → レポート表示のコアフローを実際の AWS 環境でスモークテストする
  - 本番環境で画像アップロード → 評価実行 → レポート確認の一連のフローが正常完了する
  - _Requirements: 9.1, 9.4_
  - _Depends: 8.1_

---

## Task 9: テストカバレッジ（任意）

- [ ]* 9.1 コアロジックの単体テストを追加する
  - Persona Service の `displayName` バリデーションロジックをテストする
  - Report Service の支持率・総合勝者算出ロジックをテストする
  - Evaluation Orchestrator の 25 本バッチ分割ロジックをテストする
  - テストが全件 pass し、要件 2.6・6.2・5.6 の受け入れ条件がコードレベルで検証できる
  - _Requirements: 2.6, 5.6, 6.2_

- [ ]* 9.2 インテグレーションテストを追加する
  - DynamoDB Local を使ったペルソナ CRUD の統合テストを実装する
  - Bedrock tool use スキーマの統合テストを sandbox アカウントで実施する
  - テストが CI で実行でき、要件 5.2 の構造化出力契約が検証される
  - _Requirements: 5.2, 8.1_
