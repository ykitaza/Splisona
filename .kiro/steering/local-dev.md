# ローカル開発環境の起動手順

## 前提

- Docker Desktop が起動済みであること
- AWS 認証情報が設定済みであること（`aws sts get-caller-identity` で確認）
  - アカウント: `969624666976`、IAM ユーザー: `pon`
- pnpm がインストール済みであること

## 起動手順

### 1. DynamoDB Local を起動

```bash
docker run -d --name chorus-dynamodb-local \
  -p 8000:8000 \
  amazon/dynamodb-local:latest
```

> すでに起動済みの場合はスキップ。コンテナ名 `chorus-dynamodb-local` で管理されている。
> 状態確認: `docker ps | grep chorus-dynamodb-local`

### 2. DynamoDB テーブルを初期化（初回のみ）

```bash
DYNAMODB_ENDPOINT=http://localhost:8000 pnpm db:init
```

> テーブル `chorus-main` が作成済みの場合は "already exists" と表示されスキップされる。

### 3. バックエンドを起動（実 Bedrock モード）

```bash
LOCAL_BEDROCK=true pnpm dev:backend
```

> `http://localhost:3001` で起動する。
> `LOCAL_BEDROCK=true` を省略するとスタブモード（ランダム評価・固定テキスト返却）になる。

### 4. フロントエンドを起動

```bash
VITE_LOCAL_USER_ID=<任意のユーザーID> pnpm dev:frontend
```

> `VITE_LOCAL_USER_ID` を設定することで Cognito 認証をバイパスし、ローカルユーザーとして動作する。
> 例: `VITE_LOCAL_USER_ID=user-local-001 pnpm dev:frontend`
> `http://localhost:5173` で起動する。

## 環境変数まとめ

| 変数 | 設定場所 | 値（ローカル） |
|---|---|---|
| `DYNAMODB_ENDPOINT` | `.env.local` または inline | `http://localhost:8000` |
| `TABLE_NAME` | `.env.local` | `chorus-main` |
| `LOCAL_BEDROCK` | inline | `true` |
| `BEDROCK_MODEL_ID` | 省略可 | `us.anthropic.claude-haiku-4-5-20251001-v1:0`（デフォルト） |
| `AWS_REGION` | 省略可 | `us-east-1`（デフォルト） |
| `VITE_LOCAL_USER_ID` | inline | 任意の文字列 |
| `VITE_API_URL` | 省略可 | `http://localhost:3001`（デフォルト） |

`.env.local` には `DYNAMODB_ENDPOINT` と `TABLE_NAME` が設定済み。

## 停止・クリーンアップ

```bash
# DynamoDB Local コンテナ停止
docker stop chorus-dynamodb-local

# コンテナを削除して再作成する場合
docker rm chorus-dynamodb-local
```

## トラブルシューティング

| 症状 | 確認・対処 |
|---|---|
| `Request must contain...AWS access key` | AWS 認証情報が未設定。`aws sts get-caller-identity` で確認 |
| DynamoDB 接続エラー | `docker ps` でコンテナ稼働確認。`curl http://localhost:8000` でポート確認 |
| Bedrock 呼び出しエラー | モデルが `us-east-1` で有効か確認。`BEDROCK_MODEL_ID` で別モデルへ切り替え |
| フロントエンドが401 | `VITE_LOCAL_USER_ID` が未設定。バックエンドの `x-local-user-id` ヘッダーが必要 |
