# Requirements Document

## Project Description (Input)
Chorus — AIペルソナによるデザインA/Bテストツール。

【プロダクト概要】
デザイナーが2つのデザイン案(A案/B案)を、事前に作成した「AIペルソナ」たちに自動でUXレビューさせ、どちらが優れているかを定量・定性で受け取るWebアプリ。アプリ名は「Chorus」(複数ペルソナの声が集まって一つの評価になる、の含意)。

【ユースケース】
1. 新規デザインの2案比較: A案・B案のデザインを入力し、ターゲット層に近いAIペルソナを選んでテスト実行。「A案の支持率67%、理由は〇〇」という結果とペルソナ別レビューを受け取り、意思決定の自信を得る。
2. リニューアル検証: 現行サイト(A案) vs Figma改修案(B案)を比較し、「改修案の方が迷わず進めた」等のレポートを得て、チーム/クライアントに客観データとして提案する。

【入力方式(段階リリース)】
- 画像アップロード(MVPの起点。最もリスクが低く、これだけでコア価値が成立する)
- Figma フレームURL(Figma OAuth連携 + Images API。フェーズ2)
- 現行サイトURLの自動スクリーンショット(Playwright等。最難でフェーズ3)
比較の公平性のため、A案/B案は同一条件で画像化し、最終的にBedrockへは「画像」を共通入力とする。Figma案のみスキーマ(Files API由来のテキスト/構造)を補助情報として添えられる。

【AI評価(中核機能)】
選択した各AIペルソナごとにプロンプトを構築し、A案・B案の画像とともにAmazon Bedrock(Anthropic Claude)へリクエスト。ペルソナ視点の勝敗・理由(定性コメント)・評価軸別スコアを構造化JSON(tool use)で返却させ、DynamoDBに保存し、結果レポート画面で可視化する。多数ペルソナ(最大100程度)は非同期ファンアウト(Step Functions/SQS)で並列実行し、実行中の進捗を表示する。

【主要機能】
1. ペルソナ管理: ターゲット属性(表示名/タイプ/年齢/性別/職業/偏差値/年収/学歴/自由記述)を入力し、AIペルソナを作成・編集・保存。AIアシストで下書き生成。ペルソナへの個別インタビュー(チャット)も可能。
2. A/Bテスト作成: 入力方式を選んで2案を指定し、評価させるペルソナを選択。
3. A/Bテスト実行・評価・可視化: 上記AI評価。結果は総合判定(勝者/支持率ドーナツ)、比較デザインプレビュー、評価のまとめ(支持理由の合成)、評価軸別の比較、ペルソナ別の評価テーブルで表示。エクスポート/再実行。
4. 認証: デザイナーのサインイン(Amazon Cognito)。

【技術スタック】
フロント: SPA(Vite + React, TypeScript) / Tailwind CSS / shadcn/ui。ホスティングは静的配信(S3 + CloudFront)。認証後の管理画面でSEO目的のSSRは不要なためSPAとする。
バックエンド: サーバーレスAPI(Amazon API Gateway + AWS Lambda, TypeScript)。重いAI評価ジョブは AWS Step Functions / SQS でファンアウトして非同期並列実行(最大100ペルソナ)。
インフラ: AWS CDK(TypeScript)で全リソースを定義。DB: Amazon DynamoDB(オンデマンド、Users/Projects/Personas/ABTests のPK/SK設計)。認証: Amazon Cognito。AI: Amazon Bedrock(Anthropic Claude、マルチモーダル+tool use)。AWS SDK for JavaScript v3。IAMは最小権限(DynamoDB読み書き、bedrock:InvokeModel)をgrantで付与。
※フロント/バックの最終的なフレームワーク詳細は design フェーズで確定する。当初案の Next.js フルスタック(Amplify SSR)は不採用(SSR不要 + 長時間ジョブの分離が必須のため)。

【現状】
UI/UXは Pencil(.pen)で全11画面のデザインが完成済み(S0サインイン/S1ダッシュボード/S2ペルソナ管理/S2b編集/S2c詳細+インタビュー/S3-1入力/S3-2ペルソナ選択/S3-3確認/S4実行中/S5結果レポート/S6設定)。本仕様はこのデザインを正としてSPA+サーバーレスAPI実装に落とすための要求を構造化する。言語は日本語。

## Introduction
本書は「Chorus」(AIペルソナによるデザインA/Bテストツール)の要求仕様である。デザイナーが2つのデザイン案を、自身が定義したAIペルソナ群にUXレビューさせ、定量(支持率・評価軸スコア)と定性(理由コメント)の両面で勝敗を受け取ることを目的とする。本書は「何を満たすべきか(WHAT)」を定義し、実装方式(HOW)の詳細は design フェーズで確定する。受け入れ条件はEARS書式で記述する。主語(system)はコンポーネント単位の役割名(例: Authentication Service, Persona Service, Evaluation Service)で表す。

## Boundary Context
- **In scope**: デザイナーのサインイン、ペルソナの作成/編集/削除とAIアシスト下書き、ペルソナへのインタビュー(チャット)、A/Bテストの作成(入力=画像アップロード必須・Figma URL/サイトURLは段階追加)、AIペルソナによる評価(最大100並列)、結果レポートの可視化/エクスポート/再実行、ダッシュボードでのテスト一覧。
- **Out of scope**: 複数ユーザーでの共同編集や権限ロール管理、課金/請求、A/B以外の多変量テスト、モバイルネイティブアプリ、ペルソナの一般公開/マーケットプレイス、実ユーザー行動ログの収集。
- **Adjacent expectations**: Figma OAuth/REST API(外部サービス・要連携設定)、Amazon Bedrock のモデル可用性・レート制限・コスト、任意URLのスクリーンショット取得基盤の堅牢性(実装前に技術スパイクで検証が必要・取得失敗時は手動アップロードで代替)。

## Requirements

### Requirement 1: 認証とアクセス制御
**Objective:** デザイナーとして、安全にサインインして自分専用の作業領域にアクセスしたい。なぜなら自分のペルソナやテスト結果を保護したいからである。

#### Acceptance Criteria
1. When ユーザーが有効な認証情報でサインインを送信したとき、the Authentication Service shall 認証を確立しダッシュボード(S1)へ遷移させる。
2. If 認証情報が無効なとき、then the Authentication Service shall エラーメッセージを表示し再入力を促す。
3. While ユーザーが未認証の状態であるとき、the Chorus shall 保護リソース(ペルソナ・テスト・結果)へのアクセスを拒否しサインイン画面へ誘導する。
4. Where 組織アカウント(SSO)が構成されているとき、the Authentication Service shall SSOによるサインインを提供する。
5. When ユーザーがサインアウトを実行したとき、the Authentication Service shall セッションを破棄し以降の保護リソースアクセスを拒否する。

### Requirement 2: ペルソナ管理
**Objective:** デザイナーとして、評価させたいターゲット層をAIペルソナとして作成・編集・保存したい。なぜなら自分の対象ユーザーの視点でレビューを得たいからである。

#### Acceptance Criteria
1. When ユーザーがペルソナ属性(表示名・タイプ・年齢・性別・職業・偏差値・年収・学歴・自由記述)を入力して保存したとき、the Persona Service shall ペルソナを永続化し一覧に反映する。
2. When ユーザーが既存ペルソナを編集して保存したとき、the Persona Service shall 変更内容を永続化する。
3. When ユーザーがペルソナの削除を確定したとき、the Persona Service shall 当該ペルソナを削除し一覧から除外する。
4. The Persona Service shall サインイン中のユーザーが作成したペルソナのみを表示・編集・削除可能にする。
5. Where AIアシストが要求されたとき、the Persona Service shall 入力済み属性をもとに人物像と自由記述の下書きを生成して提示する。
6. If 必須項目(表示名)が未入力のまま保存が要求されたとき、then the Persona Service shall 保存を中止し不足項目を通知する。

### Requirement 3: ペルソナへのインタビュー
**Objective:** デザイナーとして、特定のペルソナに直接質問したい。なぜならテスト前後にそのペルソナのUX観点の意見を深掘りしたいからである。

#### Acceptance Criteria
1. When ユーザーが特定ペルソナへ質問を送信したとき、the Interview Service shall そのペルソナの人物設定に基づく回答を生成して会話に表示する。
2. While 回答を生成しているとき、the Interview Service shall 生成中であることを示す。
3. If 回答生成に失敗したとき、then the Interview Service shall エラーを表示し再試行を可能にする。

### Requirement 4: A/Bテストの作成と入力
**Objective:** デザイナーとして、比較したい2案を柔軟な入力方式で指定し、評価させるペルソナを選びたい。なぜならFigmaやURL、手元の画像など状況に応じて2案を用意したいからである。

#### Acceptance Criteria
1. When ユーザーがA案・B案それぞれの入力方式を選択したとき、the ABTest Service shall 「画像アップロード」「Figma URL」「サイトURL」から選択できるようにする。
2. When ユーザーがA案・B案の画像をアップロードしたとき、the ABTest Service shall 画像を保存し各案のプレビューを表示する。
3. Where Figma URLが指定されたとき、the ABTest Service shall 連携設定のもとに該当フレームを画像として取得する。
4. Where サイトURLが指定されたとき、the ABTest Service shall 当該ページのスクリーンショットを画像として取得する。
5. If 指定された入力(URL/画像)の取得または読み込みに失敗したとき、then the ABTest Service shall エラーを示し、画像の手動アップロードによる代替を提供する。
6. The ABTest Service shall A案・B案を同一条件で画像化し、評価入力の公平性を保つ。
7. When ユーザーが評価対象のペルソナを選択したとき、the ABTest Service shall 選択人数を確認画面(S3-3)に表示する。
8. If A案・B案または対象ペルソナが未指定のままテスト実行が要求されたとき、then the ABTest Service shall 実行を中止し不足項目を通知する。

### Requirement 5: AIペルソナによる評価の実行
**Objective:** デザイナーとして、選んだペルソナ全員にA案・B案を評価させたい。なぜなら多様な視点から客観的な勝敗と理由を得たいからである。

#### Acceptance Criteria
1. When ユーザーがテスト実行を開始したとき、the Evaluation Service shall 選択された各ペルソナについてA案・B案の画像と人物設定からプロンプトを構築し評価を要求する。
2. The Evaluation Service shall 各ペルソナの評価結果を、勝者(A/B)・理由(定性コメント)・評価軸別スコアを含む構造化データとして取得する。
3. While 複数ペルソナの評価を実行しているとき、the Evaluation Service shall 評価を並列に処理し、完了件数などの進捗(S4)を表示する。
4. If 個々のペルソナ評価が失敗したとき、then the Evaluation Service shall 当該評価を再試行し、最終的に失敗した分を結果に区別して記録する。
5. When すべての対象ペルソナの評価が完了したとき、the Evaluation Service shall 結果を永続化し結果レポートへ遷移可能にする。
6. The Evaluation Service shall 1テストあたり最大100ペルソナの評価を処理できる。

### Requirement 6: 結果レポートの可視化
**Objective:** デザイナーとして、評価結果を一目で理解し共有したい。なぜなら自信を持って意思決定し、チームやクライアントに提案したいからである。

#### Acceptance Criteria
1. When ユーザーが完了したテスト結果を開いたとき、the Report Service shall 総合判定(勝者・支持率)、比較デザインプレビュー、評価のまとめ、評価軸別の比較、ペルソナ別の評価を表示する。
2. The Report Service shall 各ペルソナの勝敗・理由・スコアに基づいて支持率と総合勝者を算出して提示する。
3. When ユーザーがエクスポートを要求したとき、the Report Service shall 結果を共有可能な形式で出力する。
4. When ユーザーが再実行を要求したとき、the Report Service shall 同一の入力と対象ペルソナで新しい評価を開始する。
5. While 評価が未完了のテストを開いているとき、the Report Service shall 完了済みの結果ではなく実行状況(進捗)を表示する。

### Requirement 7: ダッシュボードとテスト一覧
**Objective:** デザイナーとして、過去・進行中のテストを把握したい。なぜなら作業の続きや過去の結果へ素早く戻りたいからである。

#### Acceptance Criteria
1. When ユーザーがダッシュボード(S1)を開いたとき、the Chorus shall 最近のA/Bテストと主要指標を一覧表示する。
2. When ユーザーが一覧から特定のテストを選択したとき、the Chorus shall 対応する結果レポートまたは実行状況を表示する。

### Requirement 8: データ永続化とセキュリティ
**Objective:** プロダクト責任者として、ユーザーデータを安全かつ分離して保持したい。なぜなら各デザイナーの資産を保護し最小権限を担保したいからである。

#### Acceptance Criteria
1. The Chorus shall ユーザー・プロジェクト・ペルソナ・A/Bテストのデータを永続化する。
2. The Chorus shall 各ユーザーのデータを他ユーザーから分離し、本人のみがアクセスできるようにする。
3. The Chorus shall データアクセスとAI呼び出しに必要な最小権限のみを各コンポーネントへ付与する。
4. The Chorus shall アップロード/取得した比較デザイン画像を、当該ユーザーのテストに紐づけて保管する。

### Requirement 9: 段階リリース・性能・耐障害性(非機能)
**Objective:** プロダクト責任者として、最大リスクを避けつつ価値を早く届け、重い処理でも快適に使えるようにしたい。なぜなら未検証の自動取得に依存せずMVPを成立させ、スケール時も破綻させたくないからである。

#### Acceptance Criteria
1. The Chorus shall 画像アップロードによる入力のみで、テスト作成→評価→結果のコア機能を完結できる(MVP)。
2. Where Figma URL連携またはサイトURL自動スクリーンショットが有効化されているとき、the Chorus shall それらを追加の入力方式として提供する。
3. While 評価ジョブが長時間実行されているとき、the Chorus shall UIをブロックせず進捗確認を可能にする。
4. If 外部AI呼び出し(Bedrock等)がレート制限または一時障害に達したとき、then the Evaluation Service shall バックオフ再試行を行い、回復不能な場合はユーザーに通知する。
5. The Chorus shall 評価対象ペルソナ数が増減しても、UIのレイアウトを破綻させずに表示する。
