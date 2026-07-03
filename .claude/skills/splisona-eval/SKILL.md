---
name: splisona-eval
description: >-
  デザイン/LP/UI の A/B 比較評価を AI ペルソナで実行し Splisona にレポートを残すスキル。
  UI・LP・デザインの変更を報告する前のセルフレビュー、2案の比較依頼、
  「ペルソナ評価して」「Splisona で評価」「デザインを評価」等の依頼で使用する。
  評価推論はローカルのサブエージェントで並列実行し、結果を splisona CLI で送信する。
---

## このスキルの考え方

Splisona は「AI ペルソナによる A/B 評価」を行うプロダクトだが、このスキルでは**評価の推論そのもの
（各ペルソナがどちらの案を良いと判断するか）は Splisona サーバーではなく、Claude Code のサブエージェントが
ローカルで担当する**。Splisona サーバー / API は入力（画像・ペルソナ定義）の受け渡しと、
評価結果の保存・レポート表示（フロントエンドの閲覧 UI）に使う。

流れ: 認証確認 → 画像準備 → ペルソナ取得 → テスト作成 → **ペルソナごとにサブエージェントを並列起動して評価**
→ （任意）要約・改善提案もローカル生成 → 結果を CLI で送信 → レポート取得・提示。

## 0. 前提確認

```bash
splisona auth status
```

失敗（未認証）した場合は、**エージェントが代行してログインしようとしない**。
ユーザーに `splisona auth login` の実行を依頼し、そこで作業を中断する。

CLI の実行方法（リポジトリ内で完結させる場合）:

```bash
pnpm --filter @chorus/cli exec splisona ...
# または
npx tsx packages/cli/src/index.ts ...
```

ローカル API を使う場合は環境変数 `SPLISONA_API_URL=http://localhost:3001` を設定する。

## 1. 入力の準備

比較する2枚の画像を用意する。

- A = 現行 / 比較元
- B = 変更後 / 提案

画像が URL でしか手に入らない場合はキャプチャコマンドを使う。

```bash
splisona capture <url> -o a.png            # 単一画像（7800px 以内に自動クランプ）
splisona capture <url> -o a.png --split    # 縦長ページ推奨: 原本 + 分割セグメント (a-1.png, a-2.png, ...)
```

**縦長ページ（高さ 2600px 超）は `--split` を使うこと。** 1枚に潰すとモデル内部の縮小で文字が読めなくなる。
分割仕様: セグメント高 2000px・のりしろ 150px・最大6分割。原本は表示用、セグメントが評価入力。

## 2. ペルソナ取得

```bash
splisona personas pull --json
```

`personaId` / `displayName` / `type` / 属性（age, gender, annualIncome, education, deviationScore 等） /
`occupation` / `freeText` を取得する。

## 3. テスト作成

```bash
splisona test create --title "<A側 | B側 形式>" -A a.png -B b.png [--personas id,..] [--focus "<注目ポイント>"]
```

出力される `testId` を以降のステップで使う。

## 4. 評価のローカル実行（このスキルの核心）

ペルソナごとに **Task ツールでサブエージェント（`model: sonnet` 推奨）を並列起動**する。
5体ずつ程度のバッチで並列起動してよい。各サブエージェントには次を渡す。

**分割画像を使う場合**（`--split` で撮影した場合）: 各サブエージェントに A の全セグメント → B の全セグメントの順で Read させ、ペルソナプロンプトの「最初の画像がデザインA〜」の行を次のブロックに差し替える（バックエンドの `buildEvaluationPrompt` と同一文面。resolvedPrompt にもこの文面を含める）:

```
画像について: デザインAは1枚の縦長ページを上から順に{countA}分割したもの（画像1〜{countA}）、デザインBは{countB}分割したもの（画像{countA+1}〜{countA+countB}）です。分割は表示上の都合であり、実際にはそれぞれ連続した1ページです。隣接する画像の端は約150px重複しています。同じ要素を二重に評価しないでください。
画像1と画像{countA+1}はそれぞれのファーストビューに相当します。最初の画面だけを見た時点の第一印象と、全体を見た後の総合評価を区別して評価してください。
```

- 2枚の画像（Read で読み込ませる。最初の画像がデザインA、次の画像がデザインB）
- 以下の構造のペルソナプロンプト（このプロンプト文字列自体を、評価結果の `resolvedPrompt` としてそのまま含めさせる）

```
あなたは「{displayName}」というペルソナです。
タイプ: {type}（タイプの説明）
属性: {age}歳 / {gender} / 年収{annualIncome}万円 / {education} / 偏差値{deviationScore}（存在する項目のみ）
職業: {occupation}
詳細: {freeText}

最初の画像がデザインA、次の画像がデザインBです。
あなたのペルソナ視点から評価してください。
scoresA と scoresB に、A案・B案それぞれの各軸スコア（0〜100）を採点してください。reason は必ず日本語で記述してください。
（--focus 指定時）注目ポイント: {focusPoints}
```

サブエージェントの最終出力は、次の JSON のみとする（前後に説明文を付けさせない）。

```json
{"winner":"A|B|none","confidence":0-100,"reason":"日本語の評価コメント","scoresA":{"usability":0,"aesthetics":0,"clarity":0,"engagement":0,"trust":0},"scoresB":{...}}
```

## 5.（任意・推奨）要約と改善提案もローカル生成

全ペルソナの評価が揃ったら、別のサブエージェント1体に評価コメント一覧（reason 群）を渡して、
以下を生成させる。

- `reasonSummary`: `{reasonsA: string[3-4], reasonsB: string[2-4], winnersReasonSummary: string}`
- `improvementReport`: `{designSummaryA, designSummaryB, suggestions: [{target:"A"|"B", kind:"weakness"|"transplant", title, evidence, quote?, implementationPrompt}]}`
  - A向け5件・B向け5件
  - `implementationPrompt` は「## 課題 / ## 修正指示 / ## 完了条件」の3節構成にする

このステップを省略した場合はサーバー側（Gemini）が自動補完する。**完全ローカルで完結させたい場合は省略しない。**

## 6. 結果送信

`results.json` を組み立てて送信する。

```json
{"model":"<評価に使ったモデル名>","evaluations":[{"personaId":"...","winner":"...","confidence":85,"reason":"...","scoresA":{...},"scoresB":{...},"resolvedPrompt":"..."}],"reasonSummary":{...},"improvementReport":{...}}
```

```bash
splisona results push <testId> results.json
```

## 7. 結果の利用

- 改善提案（implementationPrompt）の取得: `splisona report get <testId> --json`。必要ならそのまま修正タスクとして適用する
- 合否ゲートとして使う場合: `splisona report get <testId> --fail-below 70`（exit 1 なら基準未達）
- ユーザーへの報告には `splisona report open <testId>` の URL を添える

## 注意事項

- 画像は評価者（サブエージェント）にしか渡らない。Splisona へのアップロードは test create 時のみ（レポート表示用）。
- 同一テスト間の比較はモデルが同じ場合のみ有意（results の `model` フィールドで来歴が残る）。
- 評価サブエージェントは並列起動してよい（5体ずつ程度のバッチ推奨）。
