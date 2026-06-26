# Requirements Document

## Project Description (Input)

ペルソナがAIとして振る舞うときのプロンプトを設定画面（S6 設定）で管理できる機能。現状プロンプトはバックエンドの4ハンドラ（interview/handler.ts の buildSystemPrompt、evaluation/orchestrator.ts、persona/handler.ts の generateDraft、report/handler.ts）にベタ書きされている。各プロンプトは「①ペルソナ属性ブロック(自動生成・固定) ②役割/トーン指示(自由編集可) ③出力契約=ツール名やJSON構造・言語指定(ロック・末尾にシステムが自動付与)」の3層構造を持つ。設定画面ではユーザーが②の役割/トーン指示部分だけを編集でき、①と③はシステムが固定する。インタビュー用途のみ③(出力契約)が無く後半が全て自由編集となる。保存スコープはユーザー単位（そのユーザーの全テスト・全ペルソナに適用）。未設定の場合はコード内のデフォルトテンプレートを使う（既存挙動を壊さない）。対象は4用途（インタビュー会話、デザイン評価、ペルソナ自動生成ドラフト、結果要約）。フロントは React、バックエンドは AWS Lambda + DynamoDB + Bedrock(Converse API)。デザインは design/chorus.pen の S6 設定画面に「AIプロンプト設定」カードとして既に作成済み。

## Requirements

<!-- Will be generated in next phase -->
