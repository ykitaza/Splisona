# Project Structure

## Organization Philosophy

**ドメイン分割**（バックエンド）と**ページ中心**（フロントエンド）の二層構成。バックエンドは機能ドメインごとにディレクトリを切り、フロントエンドはページとその共有コンポーネントで整理する。

## Directory Patterns

### バックエンド: ドメインディレクトリ
**Location**: `packages/backend/src/<domain>/`  
**Purpose**: `handler.ts` がLambdaハンドラーとして機能し、ルーティング・ビジネスロジックを担う  
**ドメイン一覧**: `persona/`, `abtest/`, `evaluation/`, `interview/`, `report/`, `capture/`, `settings/`, `api/`

```
packages/backend/src/
├── shared/          # 共有ユーティリティ（dynamo.ts, bedrock.ts, types.ts）
├── dev-server.ts    # ローカル開発用Honoサーバー（本番では使わない）
├── persona/handler.ts
├── abtest/handler.ts
├── evaluation/orchestrator.ts
└── ...
```

### フロントエンド: ページ + コンポーネント
**Location**: `packages/frontend/src/`  
**Purpose**: ページはルート単位のビュー、コンポーネントはページ間再利用部品

```
packages/frontend/src/
├── pages/           # ルート対応ビュー（PascalCase + Page suffix）
├── components/
│   ├── ui/          # 汎用プリミティブ（Button, Input等）
│   ├── auth/        # 認証関連（AuthGuard等）
│   └── persona/     # ペルソナドメイン特化コンポーネント
├── api/             # APIクライアント（client.ts + ドメイン別モジュール）
├── hooks/           # カスタムフック
├── types/           # フロントエンド型定義
└── lib/             # Amplify設定等
```

## Naming Conventions

- **Pageコンポーネント**: `PascalCase + Page` suffix（例: `TestReportPage.tsx`）
- **テストファイル**: 対象ファイルと同ディレクトリに `*.test.tsx` / `*.test.ts`（例: `TestReportPage.test.tsx`）
- **バックエンドハンドラー**: `handler.ts` 固定
- **共有型**: `types.ts`（バックエンド）/ `types/index.ts`（フロントエンド）
- **DynamoDBキーヘルパー**: `*Key()` 関数（例: `abtestKey()`, `evaluationKey()`）

## Import Organization

```typescript
// フロントエンド: 相対パスのみ（エイリアスなし）
import { apiRequest } from '../api/client';
import { PersonaCard } from '../components/persona/PersonaCard';

// バックエンド: 相対パス + .js 拡張子必須（ESM）
import { getItem, putItem } from './shared/dynamo.js';
import { bedrockClient, MODEL_ID } from './shared/bedrock.js';
```

## Code Organization Principles

- **バックエンドのLambdaハンドラー**: `(event) => { headers, statusCode, body }` シグネチャで統一
- **ローカルdevサーバー**: 本番と同一ハンドラーを `toEvent()` アダプターで呼び出し、差分はスタブ/実Bedrockの切り替えのみ
- **型共有**: フロントエンドとバックエンドで型定義を重複させる（現状パッケージ間の型共有なし）
- **仕様管理**: `.kiro/specs/<feature>/` に要件・設計・タスクを格納し、段階的に実装する

## Spec Directory
**Location**: `.kiro/specs/<feature-name>/`  
新機能開発は `requirements.md` → `design.md` → `tasks.md` の3フェーズ承認ワークフローに従う。
