# Research & Design Decisions — chorus-ab-test

---
**Purpose**: 技術設計に向けたディスカバリーの記録。`design.md` の根拠となる調査ログ、アーキテクチャ評価、設計決定を集約する。

---

## Summary
- **Feature**: `chorus-ab-test`
- **Discovery Scope**: New Feature（グリーンフィールド — 新規プロダクト Chorus の全機能実装）
- **Key Findings**:
  - Amazon Bedrock Converse API は TypeScript SDK v3 のネイティブ `ConverseCommand` で統一的に呼び出せる。マルチモーダル（画像）と tool use（構造化 JSON 出力）を同一リクエストで組み合わせ可能。
  - Step Functions Distributed Map はデフォルトで最大 10,000 並列実行をサポート。100 ペルソナ程度は軽微であり、Inline Map（上限 40）ではなく Distributed Map を使うことで追加スケールと冪等性を確保できる。
  - DynamoDB 単一テーブル設計では PK/SK を `TYPE#ID` プレフィックスで統一し、アクセスパターンを起点に GSI を 2 本以内に抑えることで運用コストを最小化できる。
  - Amazon Cognito + OAuth 2.0 Authorization Code + PKCE フローが SPA での認証ベストプラクティス。ID Token をフロントで使い、API 呼び出しには Access Token を付与する構成が推奨。

---

## Research Log

### Amazon Bedrock Converse API — マルチモーダル + tool use

- **Context**: ペルソナ評価コアでは A/B デザイン画像を視覚的に分析し、構造化された評価結果（勝者・理由・スコア）を JSON で受け取る必要がある。
- **Sources Consulted**:
  - https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference.html
  - https://docs.aws.amazon.com/bedrock/latest/userguide/tool-use-examples.html
  - https://docs.aws.amazon.com/goto/SdkForJavaScriptV3/bedrock-runtime-2023-09-30/Converse
- **Findings**:
  - `BedrockRuntimeClient.send(new ConverseCommand(...))` で tool use + 画像を統合的に扱える。
  - tool use 時は `stopReason: "tool_use"` で応答が返り、`toolUse.input` にパースされた JSON が格納される。
  - 画像はバイト列（Base64）または S3 URI で渡せる。S3 URI 方式はペイロードサイズを削減できる。
  - 推奨モデル ID: `anthropic.claude-3-5-sonnet-20241022-v2:0`（マルチモーダル + tool use 両対応）
  - `toolChoice: { tool: { name: "..." } }` を指定すると特定ツールを強制呼び出しできる → 評価JSONの必ず返却を保証。
- **Implications**:
  - Evaluation Lambda は `ConverseCommand` を使い、`toolChoice` で `evaluate_designs` ツールを強制 → 常に構造化 JSON が返る設計。
  - 画像は S3 に保存してから S3 URI で Bedrock へ渡す → Lambda のペイロード上限を回避。

### Step Functions Distributed Map — ファンアウト並列実行

- **Context**: 最大 100 ペルソナを並列評価。各ペルソナで独立した Bedrock 呼び出しが必要。
- **Sources Consulted**:
  - https://docs.aws.amazon.com/step-functions/latest/dg/sfn-best-practices.html
  - https://dev.to/aws-builders/step-functions-distributed-map-best-practices-for-large-scale-batch-workloads-55n2
- **Findings**:
  - Inline Map: 上限 40 並列 → 100 ペルソナには不足。
  - Distributed Map: 最大 10,000 並列。各 iteration が独立した子ワークフローとして実行され、部分失敗時の再試行が容易。
  - 子ワークフロー完了後に Step Functions が集約結果をまとめて返す。DynamoDB 更新は各 iteration Lambda 内で実施し集計は別の Lambda で行う構成が一般的。
  - Bedrock のレート制限に対しては `MaxConcurrency` で並列数を制御 + Lambda 側で exponential backoff。
  - `ItemBatcher` を使うと複数ペルソナをまとめて処理でき、コスト削減になるが今回は 1 ペルソナ = 1 Bedrock 呼び出しのため不要。
- **Implications**:
  - `EvaluationOrchestrator Lambda` → Step Functions Start Execution → Distributed Map → `EvaluationWorker Lambda` (× ペルソナ数) の構成を採用。
  - `MaxConcurrency: 25` でスロットリングし Bedrock のデフォルトクォータ（RPM 制限）に収める。

### DynamoDB 単一テーブル設計

- **Context**: Users / Personas / ABTests / Evaluations の 4 エンティティを最小コストで扱う。
- **Sources Consulted**:
  - https://aws.amazon.com/blogs/compute/creating-a-single-table-design-with-amazon-dynamodb/
  - https://dev.to/urielbitton/advanced-single-table-design-patterns-with-dynamodb-4g26
- **Findings**:
  - `PK: TYPE#ID, SK: TYPE#ID` パターンで統一するとコードの見通しが良くなる。
  - GSI で PK/SK を入れ替えることで逆方向のアクセスパターンをカバー。
  - テーブル名 `chorus-main`、GSI1 を `ABTest → Evaluations` クエリに使用。
  - オンデマンドキャパシティ（PAY_PER_REQUEST）を採用しトラフィック予測不要。
- **Key Access Patterns**:
  1. ユーザーのペルソナ一覧: `PK=USER#<sub>, SK begins_with PERSONA#`
  2. ユーザーのテスト一覧: `PK=USER#<sub>, SK begins_with ABTEST#`
  3. テストの評価一覧: `PK=ABTEST#<id>, SK begins_with EVAL#` (or GSI1)
  4. ペルソナ詳細: `PK=USER#<sub>, SK=PERSONA#<id>`
  5. テスト詳細: `PK=USER#<sub>, SK=ABTEST#<id>`
- **Implications**:
  - 単一テーブルで上記アクセスパターンをすべてカバー可能。GSI は 1 本で済む。

### Amazon Cognito + React SPA 認証

- **Context**: デザイナー単独ユーザーのサインイン。SSO (SAML/OIDC) も一部対応（要求 1.4）。
- **Sources Consulted**:
  - https://docs.aws.amazon.com/prescriptive-guidance/latest/patterns/authenticate-react-app-users-cognito-amplify-ui.html
  - https://github.com/aws-samples/aws-react-spa-with-cognito-auth
  - https://www.cloudthat.com/resources/blog/securing-react-api-calls-with-amazon-cognito-jwt-tokens-and-amazon-api-gateway-authorizers
- **Findings**:
  - SPA では `oauth2/authorize` + PKCE フローが推奨（Hosted UI リダイレクト方式）。
  - `@aws-amplify/auth` v6（Amplify JS v6）が設定シンプルで Cognito Hosted UI とネイティブ統合。
  - Access Token を `Authorization: Bearer <token>` ヘッダーで API Gateway へ送り、Cognito オーソライザーで検証する構成が最もシンプル。
  - ID Token は Cognito `sub`（ユーザー識別子）取得に使用。
  - SSO は Cognito Identity Provider（SAML/OIDC フェデレーション）で設定追加のみ対応可能。
- **Implications**:
  - フロントは `@aws-amplify/auth` v6 で Cognito と統合。カスタム認証 UI は shadcn/ui で実装（Hosted UI ではなく）。
  - API Gateway には Cognito User Pool Authorizer を設定。Lambda から `event.requestContext.authorizer.claims.sub` でユーザー識別。

### S3 画像ストレージ + Presigned URL

- **Context**: A/B デザイン画像のアップロードと Bedrock への渡し方。
- **Findings**:
  - S3 Presigned PUT URL でフロントから直接 S3 アップロード → API Gateway → Lambda → S3 の中継を避けられる（Lambda 10 MB ペイロード制限を回避）。
  - Bedrock へは S3 URI（`s3://bucket/key`）で渡す。Lambda の実行ロールに `s3:GetObject` を付与。
  - CloudFront を S3 フロントに置いているが、画像プレビュー取得は CloudFront 経由 signed URL を使うことでセキュリティを保持。
- **Implications**:
  - `ABTest Service` は S3 Presigned PUT URL を生成して返し、フロントが直接 S3 へ PUT する。

---

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Layered Serverless（採用） | API Gateway + Lambda 各ドメイン + Step Functions ファンアウト | AWS マネージドスケール、コスト効率、CDK で完結 | Bedrock レート制限要注意、冷起動レイテンシ | 要求に明示されたスタックと完全一致 |
| ECS Fargate + ALB | コンテナベースのサーバー常駐型 | 長時間処理に適する | 常時コスト高、CDK 複雑化 | 今回の非同期ファンアウト設計なら不要 |
| Next.js Fullstack (Amplify SSR) | フロント/バック統合 | 開発速度高 | 長時間ジョブの分離が困難、SSR不要 | 要求書に「不採用」と明記 |

---

## Design Decisions

### Decision: Step Functions Distributed Map vs SQS + Lambda

- **Context**: 100 ペルソナの並列 Bedrock 呼び出しをどのパターンで実装するか。
- **Alternatives Considered**:
  1. SQS → Lambda Event Source Mapping — シンプルだが進捗追跡が難しい
  2. Step Functions Inline Map — 上限 40 並列で要件未達
  3. Step Functions Distributed Map — 最大 10,000 並列、進捗追跡と部分再試行が容易（採用）
- **Selected Approach**: Step Functions Distributed Map
- **Rationale**: 要件 5.3（並列進捗表示）、5.4（個別再試行）、5.6（最大 100 並列）をすべて単一パターンで満たせる。
- **Trade-offs**: Step Functions 実行コスト（state transitions ベース）が発生するが、100 ペルソナで数十円程度。
- **Follow-up**: `MaxConcurrency` チューニングは Bedrock クォータ確認後に最適化。

### Decision: Bedrock tool use による構造化出力強制

- **Context**: ペルソナ評価の結果を必ず決まった JSON 形式で受け取る必要がある。
- **Alternatives Considered**:
  1. フリーテキスト応答 + JSON パース — 脆弱、パース失敗リスク大
  2. tool use with `toolChoice.any` — ツール選択は任意
  3. tool use with `toolChoice.tool` で特定ツール強制（採用）
- **Selected Approach**: `toolChoice: { tool: { name: "evaluate_designs" } }` で強制呼び出し
- **Rationale**: 応答が必ず `evaluate_designs` の input スキーマに合致した JSON になる。再試行コストを下げる。
- **Trade-offs**: 柔軟なナラティブ応答ができなくなるが、今回は構造化スコアが主目的のため問題なし。

### Decision: S3 Presigned URL によるダイレクトアップロード

- **Context**: デザイン画像（PNG/JPEG）のアップロードを API Gateway + Lambda 経由にすると 10MB 上限に引っかかる可能性がある。
- **Alternatives Considered**:
  1. API Gateway → Lambda → S3 中継 — シンプルだが 10MB 制限
  2. S3 Presigned PUT URL（採用）— フロントが直接 S3 へアップロード
- **Selected Approach**: `ABTestService.createUploadUrl()` が Presigned PUT URL を生成しフロントへ返す。
- **Rationale**: Lambda ペイロード制限を回避しつつ、S3 ポリシーでアクセス制御可能。

### Decision: @aws-amplify/auth v6 for Cognito

- **Context**: Cognito User Pool + Hosted UI を React SPA に統合する方法。
- **Alternatives Considered**:
  1. 生の PKCE フロー実装 — 確実だが実装コスト高
  2. `@aws-amplify/auth` v6（採用）— Cognito との公式統合、設定ベース
- **Selected Approach**: Amplify Auth v6 + Cognito User Pool（カスタム UI は shadcn/ui）
- **Rationale**: Hosted UI へのリダイレクトなしでカスタム UI を維持しつつ、トークン管理・リフレッシュを Amplify に委任できる。
- **Trade-offs**: Amplify バンドルサイズ増加（`@aws-amplify/auth` のみ import で最小化）。

---

## Risks & Mitigations

- **Bedrock モデル可用性・リージョン** — `anthropic.claude-3-5-sonnet-20241022-v2:0` は主要リージョン（us-east-1, us-west-2）で利用可能。デプロイリージョンで model access 有効化が必要。
- **Bedrock RPM クォータ超過** — Step Functions `MaxConcurrency: 25` + Lambda 内 exponential backoff で対処。要件 9.4 準拠。
- **Step Functions 実行履歴上限（25,000 events）** — Distributed Map の場合、子ワークフローは独立した実行のため親の上限に影響しない。問題なし。
- **DynamoDB 容量計画** — オンデマンド採用のため自動スケール。但し突発的な大量アクセス（数百テスト同時完了）は DynamoDB burst capacity で吸収される想定。
- **Figma OAuth / URL スクリーンショット（フェーズ 2/3）** — MVP スコープ外。要件 4.3, 4.4 は段階追加対象。設計では拡張点（placeholder）を確保する。
- **Cognito Custom Domain 未設定時の Hosted UI URL** — Amplify Auth の signInWithRedirect を使わずカスタム UI を実装することで回避。

---

## References

- [Amazon Bedrock Converse API](https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference.html)
- [Tool Use Examples - Amazon Bedrock](https://docs.aws.amazon.com/bedrock/latest/userguide/tool-use-examples.html)
- [Step Functions Distributed Map Best Practices](https://dev.to/aws-builders/step-functions-distributed-map-best-practices-for-large-scale-batch-workloads-55n2)
- [DynamoDB Single Table Design](https://aws.amazon.com/blogs/compute/creating-a-single-table-design-with-amazon-dynamodb/)
- [Authenticate React App Users with Cognito](https://docs.aws.amazon.com/prescriptive-guidance/latest/patterns/authenticate-react-app-users-cognito-amplify-ui.html)
- [AWS React SPA with Cognito Auth Sample](https://github.com/aws-samples/aws-react-spa-with-cognito-auth)
