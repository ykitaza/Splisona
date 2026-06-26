# Technology Stack

## Architecture

pnpm ワークスペースによるモノレポ構成。`packages/frontend`（SPA）と `packages/backend`（Lambda ハンドラー兼ローカルdevサーバー）を分離。本番はAWS Lambda + DynamoDB + S3 + Cognito + Bedrock、ローカルはDynamoDB Local + ローカルdevサーバーで完結。

## Core Technologies

- **言語**: TypeScript（フロントエンド・バックエンド共通）
- **フロントエンド**: React 19 + React Router v6 + Vite + Tailwind CSS v4
- **バックエンド**: Hono（Lambda アダプター兼ローカルdevサーバー）+ Node.js ESM
- **AI**: Amazon Bedrock（デフォルトモデル: `amazon.nova-lite-v1:0`）
- **データストア**: Amazon DynamoDB（シングルテーブル設計）
- **認証**: AWS Amplify Auth（Cognito）/ ローカルはヘッダーベース疑似認証

## Development Standards

### Type Safety
- TypeScript strict モード。バックエンドでは `any` を避け、型キャストは `as unknown as T` パターンを使用
- DynamoDBキーは型付きテンプレートリテラル（`USER#${string}` 等）で表現

### State Management
- React 組み込みの `useState` / `useEffect` のみ使用。グローバル状態管理ライブラリなし
- サーバー状態はコンポーネント内フェッチ（`useEffect` + `apiRequest`）

### Testing
- Vitest + @testing-library/react（フロントエンド）、Vitest（バックエンド）
- テストファイルは対象ファイルと同ディレクトリに `*.test.tsx` / `*.test.ts` で配置

### API通信パターン
フロントエンドから `apiRequest<T>()` / `apiStream()` を経由してバックエンドへアクセス。認証ヘッダーは自動付与（ローカル: `x-local-user-id`、本番: `Authorization: Bearer <Cognito JWT>`）。

## Development Environment

### 必須ツール
- pnpm（ワークスペース管理）
- DynamoDB Local（ローカルDB）
- AWS 認証情報（`LOCAL_BEDROCK=true` 使用時のみ）

### 主要コマンド
```bash
# バックエンドdevサーバー起動（DynamoDB Local必須）
pnpm dev:backend

# フロントエンドdevサーバー起動
pnpm dev:frontend

# ローカルDynamoDB初期化
pnpm db:init

# Bedrockを実際に呼ぶモードで起動
LOCAL_BEDROCK=true pnpm dev:backend
```

### 環境変数
| 変数 | 用途 | デフォルト |
|---|---|---|
| `DYNAMODB_ENDPOINT` | DynamoDB Local エンドポイント | なし（本番AWS） |
| `TABLE_NAME` | DynamoDB テーブル名 | `chorus-main` |
| `LOCAL_BEDROCK` | 実Bedrock呼び出しを有効化 | `false`（スタブ） |
| `BEDROCK_MODEL_ID` | 使用モデルID | `amazon.nova-lite-v1:0` |
| `AWS_REGION` | Bedrockリージョン | `us-east-1` |
| `VITE_API_URL` | フロントエンドのAPIベースURL | `http://localhost:3001` |
| `VITE_LOCAL_USER_ID` | ローカル開発用ユーザーID | なし（Cognito使用） |

## Key Technical Decisions

- **ローカルスタブ vs 実AI**: `LOCAL_BEDROCK=false`（デフォルト）ではランダムなスタブ評価を返し、AWS認証なしで開発できる。`LOCAL_BEDROCK=true` で実Bedrockを呼ぶ
- **DynamoDBシングルテーブル**: PK/SK パターンで `USER#`, `PERSONA#`, `ABTEST#`, `EVAL#` を1テーブルに格納
- **画像の扱い**: 本番はS3 Presigned URL、ローカルは `/tmp/chorus-uploads` + スタブエンドポイント
- **ESM**: バックエンドは `"type": "module"` でESMのみ。インポートパスには `.js` 拡張子が必要
