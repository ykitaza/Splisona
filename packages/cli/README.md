# @chorus/cli (splisona)

Splisona を CLI から操作するためのツールです。AIエージェントやスクリプトから、
デザインのA/Bテスト作成・評価結果の送信・レポート取得・スクリーンショット撮影ができます。

## セットアップ

```bash
cd packages/cli
pnpm install
pnpm build
```

ローカルで動かす場合は `pnpm dev -- <args>` または `npx tsx src/index.ts <args>` を使えます。

### ログイン

```bash
splisona auth login
```

ブラウザが開き、Splisona 上で認証すると自動的にAPIキーが取得・保存されます
(`~/.splisona/config.json`、パーミッション 600)。

ブラウザを開けない環境では:

```bash
splisona auth login --manual
```

Web UI の 設定画面 > API キー で発行したキーを貼り付けてください。

ログイン状態の確認・解除:

```bash
splisona auth status
splisona auth logout
```

### 設定の優先順位

1. 環境変数 `SPLISONA_API_KEY` / `SPLISONA_API_URL`
2. `~/.splisona/config.json`
3. デフォルトの API URL (`https://splisona-api.demo-user01.workers.dev`)

## コマンド一覧

| コマンド | 説明 |
| --- | --- |
| `splisona auth login [--manual] [--api-url <url>] [--web-url <url>]` | ログインしてAPIキーを保存 |
| `splisona auth status` | ログイン状態を確認 |
| `splisona auth logout` | ログアウト(設定ファイル削除) |
| `splisona personas pull [--json]` | ペルソナ一覧を取得 |
| `splisona test create --title <t> -A <imgA> -B <imgB> [--personas <id,id,..>] [--focus <text>] [--json]` | A/Bテストを作成し画像をアップロード |
| `splisona results push <testId> <results.json> [--json]` | 評価結果ファイルを送信 |
| `splisona report get <testId> [--json] [--fail-below <n>] [--axis <axis>] [--design <A\|B\|winner>]` | レポート取得、しきい値判定 |
| `splisona report open <testId>` | ブラウザでレポートページを開く |
| `splisona capture <url> -o <out.png> [--width 1280] [--keep-overlays] [--json]` | URLをスクリーンショットとして保存(Playwrightが必要) |
| `splisona capture <url> -o <out.png> --split` | 縦長ページを原本+分割セグメントで保存 |
| `splisona split <image> [-o <base.png>] [--json]` | ローカル画像を評価用セグメントに分割(Playwrightが必要) |

すべてのコマンドは `--json` を付けると生JSONを標準出力します。

`capture` を使うには Playwright を別途インストールしてください:

```bash
pnpm add -D playwright
npx playwright install chromium
```

## エージェントからの利用例

デザイン案A/Bの比較テストを一気通貫で行う例:

```bash
# 1. ログイン(初回のみ)
splisona auth login --manual

# 2. 比較対象のスクリーンショットを撮影
splisona capture https://example.com/design-a -o /tmp/a.png
splisona capture https://example.com/design-b -o /tmp/b.png

# 3. テストを作成(全ペルソナ対象)
TEST_ID=$(splisona test create --title "LPリニューアル案" -A /tmp/a.png -B /tmp/b.png --json | jq -r .testId)

# 4. (エージェント側でペルソナ評価を実施し results.json を生成)
splisona results push "$TEST_ID" results.json

# 5. レポートを確認し、しきい値を下回っていたらCIを失敗させる
splisona report get "$TEST_ID" --fail-below 60 --axis usability
```

`--json` を使えば `jq` などでスクリプトから結果を取り回せます。
