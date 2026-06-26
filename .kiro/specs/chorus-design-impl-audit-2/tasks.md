# Implementation Plan

- [x] 1. Tailwind ダークテーマトークン基盤の構築
- [x] 1.1 CSS カスタムプロパティによるダークトークン定義
  - `index.css` の `@theme` ブロックにカラー 16 色・フォント 2 種・spacing 7 段階・角丸 3 段階・タイポグラフィ 6 サイズを定義する
  - `bg-base`, `text-hi`, `font-sans` 等の Tailwind ユーティリティクラスでトークン値を参照できることを確認する
  - 既存の `@import "tailwindcss"` と `@keyframes` は維持する
  - ビルド後に CSS カスタムプロパティが出力され、ユーティリティクラスが機能する状態になる
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. AppLayout ダーク化とルーティング再編
- [x] 2.1 Sidebar・ナビゲーションのダークトークン適用とナビ項目変更
  - Sidebar・SidebarCollapsed・AccountMenu をダークトークンで描画する
  - ナビ項目を「ペルソナ」「A|Bテスト」「結果」の 3 項目に変更し、「ダッシュボード」を除外する
  - AboutModal の背景色をダークトークンに変更する
  - Sidebar がダークトークンで描画され、3 項目のナビが表示される
  - _Requirements: 2.1, 2.2, 2.6_

- [x] 2.2 ルーティング再編とリダイレクト設定
  - `/` および `/dashboard` から `/personas` へのリダイレクトを設定する
  - `/settings` ルートを削除する
  - `/tests/new/personas` と `/tests/new/confirm` ルートを廃止する
  - `/` アクセス時に `/personas` へ遷移することを確認する
  - _Requirements: 2.3, 2.4, 2.5_

- [x] 3. 共通 UI コンポーネントの実装
- [x] 3.1 (P) Modal コンポーネントの実装
  - ダークトークンを使用したオーバーレイ付きの汎用モーダルを実装する
  - ESC キー・背景クリックでの閉じ動作を実装する
  - 設定モーダル（Req 4）とペルソナ選択モーダル（Req 6）の両方で使用できる汎用設計にする
  - モーダルが開閉し、オーバーレイが正しく表示される
  - _Requirements: 4.1, 6.2_
  - _Boundary: Modal_

- [x] 3.2 (P) FieldSlider コンポーネントの実装
  - ラベル・min/max/step・現在値表示を持つカスタムスライダーを実装する
  - ダークトークンでスタイリングし、アクセントカラーでトラックを描画する
  - 年齢・偏差値入力で使用できる状態になる
  - _Requirements: 3.4_
  - _Boundary: FieldSlider_

- [x] 3.3 (P) SegmentControl コンポーネントの実装
  - 複数選択肢から 1 つを選択するセグメント切替 UI を実装する
  - ダークトークンでスタイリングし、選択状態をアクセントカラーで示す
  - 性別入力や A/B トグルで使用できる状態になる
  - _Requirements: 3.4_
  - _Boundary: SegmentControl_

- [x] 3.4 (P) PersonaNode identicon コンポーネントの実装
  - seed 文字列から決定論的にジオメトリック identicon を生成する
  - 既存の GeneratedAvatar を置き換える
  - 同一 seed で常に同じアバターが描画されることを確認する
  - _Requirements: 3.7_
  - _Boundary: PersonaNode_

- [x] 3.5 (P) ChatBubble コンポーネントの実装
  - user / assistant のロールに応じて左右に配置されるチャットバブルを実装する
  - ダークトークンでスタイリングする
  - インタビュータブで使用できる状態になる
  - _Requirements: 3.6_
  - _Boundary: ChatBubble_

- [ ] 4. S2 結果レポート用コンポーネントの実装
- [ ] 4.1 (P) EvaluationScores 5 軸化（フロント・バックエンド）
  - フロントエンド型定義とバックエンド型定義に `trust` 軸を追加する
  - 評価プロンプトに trust 軸の評価指示を追加する
  - avgScores 集計に trust を含め、未定義の場合は集計から除外する
  - dev-server のスタブレスポンスに trust スコアを追加する
  - 5 軸スコアが API レスポンスに含まれ、既存 4 軸データでもエラーなく動作する
  - _Requirements: 5.1, 5.2_
  - _Boundary: EvaluationScores, evaluation/orchestrator, report/handler_

- [ ] 4.2 (P) RadarChart コンポーネントの実装
  - SVG で 5 軸レーダーチャートを描画する（外部ライブラリ不使用）
  - A/B 両方のポリゴンを重ねて表示し、A はアクセント色、B は win-b 色で描画する
  - `design/radar.js` を参考に頂点座標を計算する
  - 5 軸のラベルとスコアが正しく表示される
  - _Requirements: 5.4_
  - _Boundary: RadarChart_

- [ ] 4.3 (P) HelpDot と Popover 群の実装
  - HelpDot（?マーク付きインジケーター）コンポーネントを実装する
  - MethodPopover・SourcePopover・AttributePopover の 3 種のポップオーバーを実装する
  - クリックまたはホバーでポップオーバーが表示・非表示される
  - _Requirements: 5.6_
  - _Boundary: HelpDot, Popovers_

- [ ] 4.4 AttributeHeatmap コンポーネントの実装
  - タイプ/性別/年齢層 × 5 軸のクロス集計ヒートマップを実装する
  - evaluations + personas データからフロントエンドで勝率を算出する
  - SegmentControl で A/B 視点を切り替える
  - 属性別の勝率が色の濃淡で視覚化される
  - _Depends: 3.3_
  - _Requirements: 5.5_
  - _Boundary: AttributeHeatmap_

- [ ] 5. S2 結果レポートページの統合改修
- [ ] 5.1 TestReportPage の再設計
  - 総合結果を 3 セグメントバー（A/B/引分）＋判定テキスト＋「N人中M人がAを支持」で表示する
  - DonutChart と `🏆 WINNER` 表示を廃止する
  - RadarChart・AttributeHeatmap・HelpDot/Popover 群をページに統合する
  - DesignCard から全周ボーダーと Trophy バッジを除去し、勝者側に左 2px アクセントバーのみを表示する
  - 結果レポートがダークトークンで描画され、5 軸チャートとヒートマップが表示される
  - _Depends: 4.1, 4.2, 4.3, 4.4_
  - _Requirements: 5.3, 5.4, 5.5, 5.6, 5.7_

- [ ] 6. S6 統合ペルソナ画面の実装
- [ ] 6.1 PersonaUnifiedPage の基本構造とタブ切替
  - PersonaEditPage と PersonaDetailPage を 1 ページに統合し、「編集」「インタビュー」の 2 タブで構成する
  - アクティブタブの下線をアクセントカラーで表示する
  - 右カラムに PersonaNode identicon・表示名・タイプ・人物像を常時表示する
  - タブ切替が動作し、右カラムにペルソナ情報が表示される
  - _Depends: 3.4_
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 6.2 編集タブのフォームと合成プロンプトプレビュー
  - 年齢・偏差値に FieldSlider、性別に SegmentControl を使用したフォームを実装する
  - sticky フッター（削除=danger / キャンセル / 保存）を画面下部に固定表示する
  - 合成プロンプトの折りたたみ式プレビューをフォーム下部に配置する
  - フォーム入力が保存され、プロンプトプレビューが現在の設定を反映して表示される
  - _Depends: 3.2, 3.3_
  - _Requirements: 3.4, 3.5, 3.8_

- [ ] 6.3 インタビュータブのチャット UI
  - ChatBubble を使用したチャット UI を実装する
  - 既存のインタビュー API との接続を維持する
  - チャット送信・受信が ChatBubble で表示される
  - _Depends: 3.5_
  - _Requirements: 3.6_

- [ ] 7. S9 設定モーダルの実装
- [ ] 7.1 設定 API の実装（バックエンド）
  - `GET /api/settings` と `PUT /api/settings` エンドポイントを新設する
  - DynamoDB に `PK: USER#<id>, SK: SETTINGS#<section>` で設定を永続化する
  - `settingsKey()` ヘルパーを追加する
  - dev-server にルーティングを追加する
  - GET/PUT が正しく動作し、設定データが永続化される
  - _Requirements: 4.5_

- [ ] 7.2 SettingsModal の UI 実装
  - 左ナビ付き 4 セクション（一般・Figma 連携・AI モデル・プロンプト）のモーダルを実装する
  - プロンプトセクションで 4 テンプレートの一覧を表示し、選択時はドリルインで詳細画面に遷移する
  - 詳細画面は「固定コンテキスト（読み取り専用）」「固定指示（読み取り専用）」「追加指示（編集可能）」の 3 区分で構成する
  - AccountMenu の「設定」クリックでモーダルが開き、セクション切替とプロンプト詳細ドリルインが動作する
  - _Depends: 3.1, 7.1_
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 8. S4+S5 テスト作成フロー統合
- [ ] 8.1 TestInputPage への統合とペルソナ選択モーダル
  - TestInputPage・TestPersonaSelectPage・TestConfirmPage の 3 ページフローを TestInputPage 1 ページに統合する
  - ペルソナ選択ボタンクリックでモーダルによるペルソナ選択 UI を表示する
  - 確認画面を廃止し、「作成して実行」ボタンで直接テストを作成・実行する
  - Stepper コンポーネントを廃止する
  - テスト作成が 1 ページで完結し、ペルソナ選択モーダルが動作する
  - _Depends: 3.1_
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 9. S8 テスト一覧改修
- [ ] 9.1 LedgerRow コンポーネントの実装とテスト一覧置換
  - LedgerRow（チェック + サムネ + テスト名 + ペルソナ数 + ステータス + 日時）を実装する
  - ABTestTable を LedgerRow ベースの一覧に置換する
  - サムネイルに勝者デザイン画像 1 枚を表示する（DRAW → A案、未完了 → A案）
  - 一括削除モードで選択行をアクセント dim でハイライトする
  - テスト一覧が LedgerRow で表示され、サムネイルとステータスが確認できる
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 10. 残画面のダークトークン適用
- [ ] 10.1 (P) PersonaListPage のダーク化
  - インラインスタイルをダークトークンの Tailwind ユーティリティに置換する
  - PersonaCard に PersonaNode を統合する
  - 全要素がダークトークンで表示される
  - _Requirements: 8.1_
  - _Boundary: PersonaListPage_

- [ ] 10.2 (P) TestRunningPage のダーク化
  - インラインスタイルをダークトークンの Tailwind ユーティリティに置換する
  - 全要素がダークトークンで表示される
  - _Requirements: 8.2_
  - _Boundary: TestRunningPage_

- [ ] 10.3 (P) AboutModal のダーク化
  - 背景色を `$bg-surface` トークンに置換する
  - モーダルがダークトークンで表示される
  - _Requirements: 8.3_
  - _Boundary: AboutModal_
