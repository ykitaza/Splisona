# ギャップ分析レポート — chorus-ab-test

> 生成日: 2026-06-25

---

## エグゼクティブサマリー

- **現状**: 実装コードは皆無。Pencil UI デザイン（全11画面 `.pen` ファイル）と画像アセットのみ存在する、完全グリーンフィールドプロジェクト。
- **ギャップ規模**: 要求のすべてが未実装。フロントエンド SPA・バックエンド Serverless API・AWS インフラ・DynamoDB データモデル・Bedrock 連携・Step Functions 非同期処理すべてをゼロから構築する必要がある。
- **最大リスク**: Amazon Bedrock のマルチモーダル＋tool use の評価ループ設計、Step Functions/SQS ファンアウトの非同期進捗プッシュ、Figma OAuth 連携（フェーズ2）の3点。
- **推奨アプローチ**: Option B（新規コンポーネント群を構成する「層別モノレポ」）。既存資産がないため拡張対象が存在せず、初期から責務境界を明確に切る設計が長期的な保守性につながる。
- **総合工数/リスク見積もり**: XL（2+ weeks） / High（未検証統合が複数存在）。

---

## 1. 現状調査

### 1.1 リポジトリ構成（調査結果）

```
persona-ab-test/
├── .kiro/
│   ├── specs/chorus-ab-test/   # 要求仕様（本書）
│   └── settings/rules/         # 分析ルール
├── images/                     # Pencil 書き出し画像 (PNG x2)
├── pencil-new.pen              # UI デザインファイル（全11画面）
└── CLAUDE.md
```

**実装コードなし。** `package.json`・`tsconfig.json`・`cdk.json`・Lambda 関数・React コンポーネントいずれも存在しない。

### 1.2 設計資産（Pencil UI）

| 画面ID | 画面名 | 状態 |
|--------|--------|------|
| S0 | サインイン | デザイン完成 |
| S1 | ダッシュボード | デザイン完成 |
| S2 | ペルソナ管理（一覧） | デザイン完成 |
| S2b | ペルソナ編集 | デザイン完成 |
| S2c | ペルソナ詳細＋インタビュー | デザイン完成 |
| S3-1 | テスト作成（入力方式選択） | デザイン完成 |
| S3-2 | ペルソナ選択 | デザイン完成 |
| S3-3 | 確認画面 | デザイン完成 |
| S4 | 実行中（進捗） | デザイン完成 |
| S5 | 結果レポート | デザイン完成 |
| S6 | 設定 | デザイン完成 |

---

## 2. 要求フィージビリティ分析

### 2.1 要求 → 技術ニーズ マッピング

| 要求 | 技術ニーズ | 現状資産 | ギャップ分類 |
|------|------------|----------|-------------|
| R1: 認証 | Cognito User Pool、JWT 検証 Lambda Authorizer、S0 サインイン UI | なし | **Missing** |
| R2: ペルソナ管理 | DynamoDB `Personas` テーブル、CRUD API (Lambda)、S2/S2b/S2c UI、AI アシスト（Bedrock） | なし | **Missing** |
| R3: ペルソナインタビュー | Bedrock ストリーミング or 同期呼び出し、チャット UI（S2c） | なし | **Missing** |
| R4: A/Bテスト作成 | S3 (画像保存)、DynamoDB `ABTests` テーブル、S3-1〜S3-3 UI、Figma OAuth（フェーズ2）、Playwright スクショ基盤（フェーズ3） | なし | **Missing / Research Needed（フェーズ2・3）** |
| R5: 評価実行 | Step Functions Express Workflow、SQS ファンアウト、Bedrock multimodal + tool use、進捗通知（API Gateway WebSocket or ポーリング） | なし | **Missing / Research Needed（WebSocket vs ポーリング選択）** |
| R6: 結果レポート | DynamoDB `EvaluationResults` テーブル、集計ロジック、グラフ UI（S5）、PDF/CSV エクスポート | なし | **Missing** |
| R7: ダッシュボード | DynamoDB クエリ（GSI）、S1 UI | なし | **Missing** |
| R8: データ永続化・セキュリティ | DynamoDB マルチテーブル設計、IAM 最小権限 Grant、S3 バケットポリシー | なし | **Missing** |
| R9: 非機能（段階リリース・耐障害性） | 段階フラグ（Feature Flag or 環境変数）、Bedrock バックオフ再試行ロジック | なし | **Missing** |

### 2.2 研究が必要な領域（Research Needed）

1. **進捗通知方式の選択**: Step Functions 実行中の進捗を UI に届ける方法として、API Gateway WebSocket（実装コスト高・リアルタイム性優秀）vs DynamoDB ポーリング（シンプル・遅延あり）のトレードオフ検証が必要。
2. **Bedrock tool use スキーマ設計**: 評価結果 JSON（勝者・理由・評価軸スコア）の構造化出力を Claude tool use で安定して得るプロンプト設計が要技術スパイク。
3. **Step Functions ファンアウト上限**: 最大100ペルソナを並列実行した場合の Bedrock レート制限（tokens-per-minute / requests-per-minute）と SQS のバッチサイズの整合確認が必要。
4. **Figma OAuth フロー**: Figma の OAuth 2.0 認可コードフロー＋Images API の制限（フレームサイズ制限・公開権限）の事前確認が必要（フェーズ2）。
5. **S3 署名付き URL の有効期限設計**: アップロード画像は評価完了まで参照継続が必要。署名付き URL の有効期限ポリシー（またはバックエンド経由プロキシ）を設計フェーズで決定する。

---

## 3. 実装アプローチ オプション

### Option A: 単一モノリシック Lambda + シンプル構成
**対象**: 小規模 MVP を最速でデプロイしたい場合

- すべての API ロジックを単一 Lambda 関数（または少数の関数）に集約
- Step Functions を使わず、同期 Bedrock 呼び出し（タイムアウト上限29秒に注意）

**トレードオフ**:
- ✅ 構成がシンプル。初期デプロイが早い
- ✅ インフラ管理コスト最小
- ❌ Lambda 最大タイムアウト（15分）内でも大量ペルソナ並列処理は困難
- ❌ 要求 R5（最大100並列）・R9（UIブロックなし進捗）を満たせない
- ❌ スケールアウト時にリファクタが必須

### Option B: 層別モノレポ（推奨）
**対象**: 要求をすべて満たしつつ保守性を確保する場合

```
chorus/
├── packages/
│   ├── infra/          # AWS CDK スタック
│   ├── api/            # Lambda 関数群（認証・ペルソナ・テスト・評価・レポート）
│   ├── web/            # Vite + React SPA
│   └── shared/         # 型定義・ユーティリティ共有
└── package.json        # npm workspaces
```

- CDK で Cognito・API Gateway・Lambda・DynamoDB・S3・Step Functions・SQS を定義
- Step Functions Express Workflow + SQS でペルソナ評価ファンアウト
- フロントはポーリング（初期）または WebSocket（改善）で進捗取得
- Figma / Playwright 連携は環境変数フラグで段階有効化

**トレードオフ**:
- ✅ 要求 R5・R9（並列・非同期）を設計から満たせる
- ✅ 責務境界が明確で各層を独立テスト可能
- ✅ CDK により再現可能なインフラ管理
- ❌ 初期セットアップ工数が多い（モノレポ設定・CDK ブートストラップ等）
- ❌ 複数パッケージ間の型共有・バージョン管理に注意が必要

### Option C: ハイブリッド（段階実装）
**対象**: MVP を早期リリースしつつ非同期処理を後から追加したい場合

- **フェーズ1（MVP）**: Option A に近い構成（画像アップロード + 同期評価、ペルソナ数制限 ~10）
- **フェーズ2**: Step Functions/SQS ファンアウトを追加し、100並列に拡張
- **フェーズ3**: Figma OAuth・Playwright スクショを追加

**トレードオフ**:
- ✅ 早期に価値を届けられる。技術スパイクを並行実施できる
- ✅ フェーズ1でユーザーフィードバックを得られる
- ❌ フェーズ間でアーキテクチャ移行コストが発生する
- ❌ フェーズ1で同期評価の制約（タイムアウト・ペルソナ数上限）をユーザーに説明する必要がある

---

## 4. 工数・リスク見積もり

| コンポーネント | 工数 | リスク | 根拠 |
|---------------|------|--------|------|
| インフラ基盤（CDK、Cognito、DynamoDB、S3） | M | Low | CDK パターンは確立済み。設計次第でテンプレート化可能 |
| 認証フロー（R1） | S | Low | Cognito + Lambda Authorizer は標準パターン |
| ペルソナ CRUD API + UI（R2） | M | Low | 標準的な REST CRUD + フォーム UI |
| ペルソナインタビュー・チャット（R3） | S | Medium | Bedrock 同期呼び出しは検証済みパターンだが UI ストリーミング対応次第 |
| A/Bテスト作成 UI（R4 MVP） | M | Low | 画像アップロード + S3 署名付き URL は標準 |
| Bedrock 評価ループ（R5 コア） | L | High | tool use スキーマ設計と安定 JSON 出力の検証が必要 |
| Step Functions ファンアウト（R5 並列） | L | High | 100並列 + レート制限 + 進捗通知が未検証 |
| 結果レポート可視化（R6） | M | Medium | 集計ロジックは確定、グラフライブラリ選定が必要 |
| ダッシュボード（R7） | S | Low | DynamoDB GSI クエリ + 一覧 UI |
| エクスポート機能（R6-3） | S | Low | PDF/CSV 生成は確立済みライブラリを使用 |
| Figma OAuth 連携（R4-3、フェーズ2） | L | High | OAuth フロー + Figma API 制限が未検証 |
| Playwright スクショ基盤（R4-4、フェーズ3） | XL | High | 任意 URL のスクショ取得は堅牢性確保が困難。要スパイク |

**総合**: XL / High — 非同期評価パイプラインと Bedrock 統合の未検証部分がリスクの中心。

---

## 5. デザインフェーズへの引き継ぎ事項

### 優先決定事項
1. **進捗通知方式**: ポーリング（シンプル）vs WebSocket（リアルタイム）を評価し選択する
2. **DynamoDB テーブル設計**: Users / Personas / ABTests / EvaluationResults の PK/SK/GSI を確定する
3. **Bedrock tool use スキーマ**: 評価結果の JSON 構造と Claude プロンプトテンプレートを設計する
4. **モノレポ構成と共有型定義の境界**: `packages/shared` に何を置くかを決定する
5. **フェーズ分割の境界値**: MVP（フェーズ1）でのペルソナ数上限と同期評価の可否を判断する

### Research Needed（設計フェーズで調査）
- Bedrock Claude モデル選択（コスト・レート制限・マルチモーダル対応モデル一覧）
- Step Functions Express vs Standard Workflow の選択基準
- API Gateway WebSocket の CDK 実装パターン
- Figma Images API の認証フローと画像取得制限

---

*本ドキュメントは gap-analysis.md フレームワークに基づき生成されました。*
