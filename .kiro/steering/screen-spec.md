# Chorus 画面仕様書

## 共通仕様

### デザインシステム

| トークン | 値 | 用途 |
|---|---|---|
| `$bg-base` | `#0A0B0D` | ページ背景・コンテンツ直置き面 |
| `$bg-surface` | `#131517` | サイドバー・モーダル・カード背景 |
| `$bg-raised` | `#1C1F23` | ホバー・入力フィールド・ボタン背景 |
| `$hairline` | `#FFFFFF14` | 区切り線・ボーダー |
| `$text-hi` | `#F2F4F7` | 主要テキスト |
| `$text-mid` | `#9BA1AC` | 副次テキスト・ラベル |
| `$text-lo` | `#5B616B` | 最低優先テキスト・プレースホルダー |
| `$accent` | `#6E78D9` | アクティブ状態・CTA |
| `$accent-dim` | `#6E78D926` | アクティブ行ハイライト |
| `$win-a` | `#6E78D9` | デザイン A 勝者色 |
| `$win-b` | `#C9974F` | デザイン B 勝者色 |
| `$danger` | `#E06A6A` | 削除・エラー |
| `$success` | `#54B587` | 完了・成功 |
| `$draw` | `#3A3D42` | 引き分け |

**フォント**: Geist（sans）/ Geist Mono（mono）
**グリッド**: 4px / 8px スナップ
**角丸**: sm=6px / md=10px / lg=14px

### 共通レイアウト: AppLayout

全画面に適用されるシェル。

```
┌─────────────┬──────────────────────────────────┐
│  Sidebar    │                                  │
│  (surface)  │        <Outlet /> (base)         │
│             │                                  │
│  + 新規A/Bテスト │                                  │
│  A/Bテスト      │                                  │
│  ペルソナ       │                                  │
│             │                                  │
│  ...        │                                  │
│  AccountMenu│                                  │
└─────────────┴──────────────────────────────────┘
```

- **サイドバー**: 幅 240px（折りたたみ時 56px）。bg-surface。border-r hairline
- **ナビ項目**: 3 個（新規A/Bテスト=灰色丸＋白＋アイコン / A/Bテスト / ペルソナ）。アクティブ = accent + accent-dim 背景 + semibold。非アクティブ = text-mid
- **メインエリア padding**: `[48px, 128px]`（全画面統一）
- **AccountMenu**: サイドバー最下部。クリックでポップアップ（設定 / About / サインアウト）
- **メインエリア**: flex-1, overflow-y-auto, bg-base

---

## S1: ペルソナ一覧

| 項目 | 値 |
|---|---|
| **画面 ID** | S1 |
| **Pencil Node** | JAyqO |
| **URL** | `/personas` |
| **コンポーネント** | `PersonaListPage` |
| **目的** | 登録済みペルソナの一覧表示・検索・新規作成への導線 |

### レイアウト

```
ページヘッダー: "ペルソナ管理" (text-xl, text-hi) + 検索バー + [+ 新規ペルソナ] ボタン
─────────────────────────────────────────────────
グリッド (3列レスポンシブ, gap-4)
┌──────────┐ ┌──────────┐ ┌──────────┐
│ Identicon│ │ Identicon│ │ Identicon│
│ 表示名    │ │ 表示名    │ │ 表示名    │
│ タイプ    │ │ タイプ    │ │ タイプ    │
│ 人物像... │ │ 人物像... │ │ 人物像... │
└──────────┘ └──────────┘ └──────────┘
```

### 構成要素

| 要素 | 仕様 |
|---|---|
| ページタイトル | "ペルソナ管理" text-xl font-sans font-bold text-hi |
| 検索バー | bg-raised, text-sm, placeholder text-lo, 角丸 sm |
| 新規ペルソナボタン | bg-transparent, border-hairline, text-hi, text-sm, 角丸 sm, plus アイコン |
| ペルソナカード | bg-surface, 角丸 lg (14px), padding 24px, stroke #FFFFFF0F。ホバー時: bg-raised + stroke #FFFFFF29 + `...` アイコン text-mid に強調 |
| PersonaNode (identicon) | seed ベース決定論的生成。48×48。accent グロー(blur≤12, 低 alpha) |
| 表示名 | text-sm font-sans font-semibold text-hi |
| タイプ | text-xs font-sans text-mid |
| 人物像抜粋 | text-xs font-sans text-lo, 2 行制限 |

### インタラクション

- カードクリック → `/personas/:id`（S6 詳細タブ）
- カードホバー → bg-raised + ボーダー強調 + `...` アイコン表示
- `...` クリック（stopPropagation）→ コンテキストメニュー（複製 / 削除）
- [+ 新規ペルソナ] → `/personas/new`
- 検索 → displayName で部分一致フィルタ
- default ペルソナ → 編集不可バッジ表示

---

## S2: 結果レポート

| 項目 | 値 |
|---|---|
| **画面 ID** | S2 |
| **Pencil Node** | KDgO1 |
| **URL** | `/tests/:id/report` |
| **コンポーネント** | `TestReportPage` |
| **目的** | A/B テスト完了後の詳細分析レポート表示 |

### レイアウト

```
ページヘッダー: "結果レポート" (text-xl) + テスト名 (text-lo)
─────────────────────────────────────────────────
セクション: デザイン比較
  ┌─ A案 (勝者: 左2px accent bar) ─┐  ┌─ B案 (装飾なし) ─┐
  │ サムネイル画像                    │  │ サムネイル画像     │
  └──────────────────────────────────┘  └──────────────────┘

セクション: 総合結果
  "デザイン A が支持されました" (text-lg, text-hi)
  3セグメントバー: [A (accent) | draw | B (win-b)]
  "6人中4人がAを支持" (text-sm, text-mid)

─── hairline ─────────────────────────────────────
2カラム
  左: 評価のまとめ                右: レーダーチャート (5軸SVG)
    A が支持された理由 (箇条書き)    A=accent, B=win-b ポリゴン重畳
    B の評価点 (箇条書き)           凡例: レーダー下部

─── hairline ─────────────────────────────────────
セクション: 属性別ヒートマップ (full-width)
  SegmentControl: [A視点 | B視点]
  グリッド: 行=タイプ/性別/年齢層, 列=5軸
  セル色: 勝率に応じた濃淡 (accent or win-b)

─── hairline ─────────────────────────────────────
セクション: ペルソナ別評価
  行: identicon + 名前 + タイプ + 勝者バッジ + コメント抜粋
  展開 → 5軸スコア詳細 + 全文理由
```

### 構成要素

| 要素 | 仕様 |
|---|---|
| デザインカード | bg-base 直置き。勝者 A 側のみ左 2px accent バー。全周ボーダー・Trophy なし |
| 3セグメントバー | height 8px, 角丸, A=accent / draw / B=win-b の比率表示 |
| 判定テキスト | "デザイン A が支持されました" text-lg font-sans font-semibold text-hi |
| 支持率テキスト | "N人中M人がAを支持" text-sm font-sans text-mid |
| レーダーチャート | SVG 5角形。A=accent(fill 0.15), B=win-b(fill 0.15)。軸ラベル text-xs text-mid |
| ヒートマップ | 角丸なしセル。勝率高=濃色、低=薄色。トグルで A/B 視点切替。A タブ=accent (#6E78D9)、B タブ=win-b (#C9974F) |
| HelpDot | ? マーク 16px circle bg-raised text-text-lo。ホバーで Popover |
| CSV エクスポート | テキストリンク。text-sm text-accent |

### データ要件

- `GET /tests/:id/report` → テスト情報 + evaluations 配列 + reasonSummaryA/B
- `GET /personas` → ペルソナ属性（ヒートマップ集計用）
- デザイン画像: presigned URL で S3 から取得

---

## S3: テスト実行中

| 項目 | 値 |
|---|---|
| **画面 ID** | S3 |
| **Pencil Node** | OSMxe |
| **URL** | `/tests/:id/running` |
| **コンポーネント** | `TestRunningPage` |
| **目的** | テスト実行の進捗リアルタイム表示 |

### レイアウト

```
ページヘッダー: "実行中" (text-xl) + テスト名 (text-lo)   [中止ボタン]
─────────────────────────────────────────────────
進捗: "4 / 6 体 完了" (text-display, mono) + プログレスバー + "67%"
─────────────────────────────────────────────────
ペルソナ行リスト (各行):
  identicon + 名前 + タイプ + ステータス + コメント抜粋
  ステータス: 完了=success / 実行中=アニメーション / 待機=text-lo
```

### 構成要素

| 要素 | 仕様 |
|---|---|
| 完了数 | text-display font-mono text-hi。"4 / 6 体 完了" |
| プログレスバー | height 4px, bg-raised, fill=accent, 角丸 |
| パーセンテージ | text-sm font-mono text-mid |
| ペルソナ行 | bg-base 直置き。hairline で区切り |
| 実行中アニメーション | persona-waver (左右揺れ) + ai-scan (走査線) |
| コメント抜粋 | 完了行のみ表示。text-xs text-lo, 1行制限 |
| 中止ボタン | text-sm text-danger, bg なし |

### インタラクション

- 2 秒ポーリングで `GET /tests/:id/progress` を監視
- 全ペルソナ完了 → S3 完了状態を表示（COMPLETED ラベル=success 色、プログレス 100%=success 色、「結果を見る」ゴーストボタン）。自動遷移しない
- 「結果を見る」クリック → `/tests/:id/report` へ遷移
- 中止 → 確認後テストを中断

---

## S4: 新規テスト作成

| 項目 | 値 |
|---|---|
| **画面 ID** | S4 |
| **Pencil Node** | AnX1d |
| **URL** | `/tests/new` |
| **コンポーネント** | `TestInputPage` |
| **目的** | A/B テストの作成（タイトル・デザイン入力・ペルソナ選択を 1 ページで完結） |

### レイアウト

```
ページヘッダー: "新しいA/Bテスト" (text-xl)
─────────────────────────────────────────────────
テスト名入力: テキストフィールド (bg-raised, 角丸 sm)
─────────────────────────────────────────────────
2カラム
  ┌─ A案 ──────────────────┐  ┌─ B案 ──────────────────┐
  │ 入力方式タブ:            │  │ 入力方式タブ:            │
  │ [画像] [Figma] [URL]    │  │ [画像] [Figma] [URL]    │
  │                         │  │                         │
  │ ドロップゾーン /          │  │ ドロップゾーン /          │
  │ URL入力フィールド        │  │ URL入力フィールド        │
  └─────────────────────────┘  └─────────────────────────┘
─────────────────────────────────────────────────
ペルソナ選択: identicon群 + [n体選択中] + 変更ボタン
─────────────────────────────────────────────────
フッター: カウント表示 | [作成して実行] ボタン (accent)
```

### 構成要素

| 要素 | 仕様 |
|---|---|
| テスト名入力 | bg-raised, text-hi, placeholder text-lo, 角丸 sm |
| デザインカード | bg-surface, 角丸 md。"A案" / "B案" ラベル text-sm text-accent |
| 入力方式タブ | 3 タブ: 画像 / Figma / URL。アクティブ = accent 下線 |
| ドロップゾーン | border dashed hairline, text-lo 中央テキスト |
| URL 入力 | bg-raised, text-sm, prefix アイコン |
| ペルソナ表示 | 選択済み identicon を横並び + "n体選択中" text-sm text-mid |
| 作成して実行ボタン | bg-transparent, border-hairline, text-hi, font-semibold, 角丸 sm, play アイコン |

### インタラクション

- 入力方式タブ切替 → 対応する入力 UI を表示
- 画像ドロップ / ファイル選択 → presigned URL で S3 アップロード
- Figma URL 入力 → `POST /figma/verify` で検証 → スクリーンショット取得
- サイト URL 入力 → `POST /tests/:id/capture` で Playwright キャプチャ
- ペルソナ変更クリック → S5 モーダルを表示
- [作成して実行] → `POST /tests` + `POST /tests/:id/execute` → S3 へ遷移

---

## S5: ペルソナ選択モーダル

| 項目 | 値 |
|---|---|
| **画面 ID** | S5 |
| **Pencil Node** | o3pQ3 |
| **URL** | (モーダル。S4 上に表示) |
| **コンポーネント** | `PersonaSelectModal` (TestInputPage 内) |
| **目的** | テスト対象ペルソナの複数選択 |

### レイアウト

```
モーダル (bg-surface, 角丸 lg, width 560px)
  ヘッダー: "ペルソナを選択" (text-lg) + 説明文 (text-sm text-mid)
  ─────────────────────────────────────
  フィルタ行: タイプ / 出自タブ + [全選択] テキストリンク
  ─────────────────────────────────────
  リスト (スクロール可能):
    各行: チェックボックス + identicon + 名前 + タイプ + 職業
    選択行: accent-dim 背景
  ─────────────────────────────────────
  フッター: "n体選択" (text-sm) + [確定して閉じる] ボタン (accent)
```

### 構成要素

| 要素 | 仕様 |
|---|---|
| オーバーレイ | bg-black/50 |
| モーダル本体 | bg-surface, 角丸 lg, max-height 80vh |
| チェックボックス | 未選択=border hairline, 選択=bg-accent + チェックアイコン white |
| 選択行ハイライト | bg accent-dim |
| 全選択リンク | text-sm text-accent |
| 確定ボタン | bg-transparent, border-hairline, text-hi, 角丸 sm |

### インタラクション

- チェックボックスクリック → 選択/解除トグル
- 全選択 → 全ペルソナを選択
- フィルタタブ → タイプ or 出自でフィルタリング
- [確定して閉じる] → モーダルを閉じ、S4 のペルソナ表示を更新
- ESC / オーバーレイクリック → 変更を破棄してモーダルを閉じる

---

## S6-詳細: ペルソナ詳細

| 項目 | 値 |
|---|---|
| **画面 ID** | S6-詳細 |
| **Pencil Node** | RDzak |
| **URL** | `/personas/:id` (詳細タブ・デフォルト) |
| **コンポーネント** | `PersonaUnifiedPage` (tab="詳細") |
| **目的** | ペルソナ属性の読み取り専用表示 |

### レイアウト

```
2カラム
左カラム (flex-1):                       右カラム (固定幅 ~320px):
  ← ペルソナ一覧 (バックリンク)              ┌──────────────┐
  ヘッダー: ペルソナ名 (text-xl)  [編集する]  │  PersonaNode  │
  タブ: [詳細✓] [編集] [インタビュー]         │  (identicon)  │
  ─────────────────────                    │  田中 太郎     │
  基本情報:                                 │  消費者        │
    表示名: ラベル + 値                      │  人物像テキスト │
    タイプ: ラベル + 値                      └──────────────┘
  ─── hairline ───
  属性:
    年齢 / 性別 / 偏差値 / 年収 / 学歴 / 職業
    すべてラベル + 値テキスト (入力コントロールなし)
  ─── hairline ───
  人物像:
    フリーテキスト (読み取り専用)
```

### 構成要素

| 要素 | 仕様 |
|---|---|
| バックリンク | "← ペルソナ一覧" arrow-left 14px + text-sm text-mid。クリックで `/personas` へ遷移 |
| ヘッダー | ペルソナ名 text-xl font-sans font-semibold text-hi |
| タブ | 3 タブ: 詳細(アクティブ=accent 下線 2px + text-hi semibold) / 編集 / インタビュー(text-mid) |
| セクション見出し | text-xs font-mono text-lo, letter-spacing 0.5 |
| 属性ラベル | text-sm font-sans text-mid |
| 属性値 | text-base font-sans text-hi |
| 属性行 | layout vertical, gap 4, padding-bottom 8, hairline 下線 |
| 右カラム | 固定幅 320px。PersonaNode 96×96 + 名前 + タイプ + 人物像テキスト |

### インタラクション

- 編集タブクリック → 編集タブに切替
- インタビュータブクリック → インタビュータブに切替
- default ペルソナ → 編集タブで入力フォーム無効化

### データ要件

- `GET /personas/:id` → ペルソナ全属性

---

## S6-編集: ペルソナ編集

| 項目 | 値 |
|---|---|
| **画面 ID** | S6-編集 |
| **Pencil Node** | lwGts |
| **URL** | `/personas/:id` (編集タブ) |
| **コンポーネント** | `PersonaUnifiedPage` (tab="編集") |
| **目的** | ペルソナ属性の編集・AI ドラフト・プロンプトプレビュー |

### レイアウト

```
2カラム
左カラム (flex-1):                       右カラム (固定幅 ~320px):
  ← ペルソナ一覧 (バックリンク)              ┌──────────────┐
  ヘッダー: ペルソナ名 (text-xl)            │  PersonaNode  │
  タブ: [詳細] [編集✓] [インタビュー]        │  (identicon)  │
  ─────────────────────                    │  (identicon)  │
  フォーム:                                 │  田中 太郎     │
    属性 / タイプ (ドロップダウン)            │  ビジュアル型   │
    表示名 (テキスト入力)                    │  人物像テキスト │
    年齢 (FieldSlider)                     └──────────────┘
    性別 (SegmentControl: 男性/女性/その他/指定なし)
    偏差値 (FieldSlider)
    年収 (カスタムドロップダウン — ダークテーマ。ネイティブ select 不可)
    学歴 (カスタムドロップダウン — ダークテーマ。ネイティブ select 不可)
    職業 (テキスト入力)
    人物像 (テキストエリア)
  ─────────────────────
  合成プロンプトプレビュー (折りたたみ式)
  ─────────────────────
  sticky フッター: [削除(danger)] [キャンセル] [保存(accent)]
```

### 構成要素

| 要素 | 仕様 |
|---|---|
| タブ | アクティブ = accent 下線 2px + text-hi。非アクティブ = text-mid |
| FieldSlider | bg-raised トラック, accent フィル, thumb=white circle |
| SegmentControl | bg-raised 全体, 選択=bg-raised text-hi, 非選択=text-mid |
| テキスト入力 | bg-raised, text-hi, border なし, 角丸 sm |
| テキストエリア | bg-raised, text-hi, resize 可, min-height 120px |
| 右カラム identicon | 64×64, accent グロー |
| プロンプトプレビュー | 折りたたみ時: "合成プロンプト ▶" text-sm text-mid。展開時: bg-raised 内にプロンプト全文 font-mono text-xs |
| 削除ボタン | text-danger, bg-danger-dim |
| 保存ボタン | bg-transparent, border-hairline, text-hi |

### インタラクション

- フォーム変更 → 右カラムにリアルタイム反映
- AI ドラフト → `POST /personas/:id/draft` で freeText を自動生成
- 保存 → `PUT /personas/:id`
- 削除 → 確認ダイアログ後 `DELETE /personas/:id` → `/personas` へ遷移
- default ペルソナ → フォーム読み取り専用、削除ボタン非表示

---

## S6-インタビュー: ペルソナインタビュー

| 項目 | 値 |
|---|---|
| **画面 ID** | S6-インタビュー |
| **Pencil Node** | xrV41 |
| **URL** | `/personas/:id` (インタビュータブ) |
| **コンポーネント** | `PersonaUnifiedPage` (tab="インタビュー") |
| **目的** | ペルソナとのチャット会話でデザインの感想を聞く |

### レイアウト

```
2カラム
左カラム (flex-1):                       右カラム (固定幅 ~320px):
  ← ペルソナ一覧 (バックリンク)              (S6-編集と同じ右カラム)
  ヘッダー: ペルソナ名 (text-xl)
  タブ: [詳細] [編集] [インタビュー✓]
  ─────────────────────
  チャットエリア (スクロール可能):
    user バブル (右寄せ, bg-accent-dim)
    assistant バブル (左寄せ, bg-raised)
  ─────────────────────
  入力エリア: テキスト入力 + 送信ボタン
```

### 構成要素

| 要素 | 仕様 |
|---|---|
| user バブル | 右寄せ, bg-accent-dim, 角丸 md, text-sm text-hi |
| assistant バブル | 左寄せ, bg-raised, 角丸 md, text-sm text-hi |
| ロールラベル | text-xs text-lo, バブル上部 |
| 入力フィールド | bg-raised, text-sm, 角丸 sm, flex-1 |
| 送信ボタン | bg-transparent, border-hairline, icon のみ (Send), 角丸 sm |

### インタラクション

- メッセージ送信 → `POST /personas/:id/interview` → assistant レスポンスをストリーム表示
- 送信中 → 送信ボタン disabled, ローディング表示
- 新規会話 → チャット履歴はセッション内のみ保持

---

## S8-通常: テスト一覧

| 項目 | 値 |
|---|---|
| **画面 ID** | S8-通常 |
| **Pencil Node** | bx0T4 |
| **URL** | `/results` |
| **コンポーネント** | `TestListPage` |
| **目的** | 全テストの一覧表示・結果閲覧・削除管理 |

### レイアウト

```
ページヘッダー: "A/Bテスト" (text-xl)  [絞り込み すべて ∨] [テストを選択] [+ 新規テスト]
検索バー: bg-raised, 角丸 md, 検索アイコン + "テストを検索..." プレースホルダー
─────────────────────────────────────────────────
シンプルリスト (hairline 区切り):
  各行: テスト名 (左)                              相対日付 (右)
```

### 構成要素

| 要素 | 仕様 |
|---|---|
| リスト行 | bg-base 直置き。hover=bg-raised。hairline bottom 区切り。padding [18, 8] |
| テスト名 | text-base font-sans text-hi |
| 相対日付 | text-sm font-sans text-lo |
| 検索バー | bg-raised, 角丸 md, padding [12, 16]。アイコン + プレースホルダー text-lo |
| 絞り込みボタン | border-hairline, text-mid "絞り込み" + text-hi "すべて" + chevron-down text-lo |
| テストを選択ボタン | bg-transparent, border-hairline, text-mid |
| 新規テストボタン | bg-transparent, border-hairline, text-hi, plus アイコン |

### インタラクション

- 行クリック → ステータスに応じて遷移: completed→`/tests/:id/report`, running→`/tests/:id/running`
- [+ 新規テスト] → `/tests/new`
- [テストを選択] → 一括削除モード (S8-一括削除) に切替
- 検索 → タイトルで部分一致フィルタ
- 絞り込み → ステータスでフィルタ

---

## S8-一括削除: テスト一覧（一括削除モード）

| 項目 | 値 |
|---|---|
| **画面 ID** | S8-一括削除 |
| **Pencil Node** | zd8V4 |
| **URL** | `/results` (一括削除モード) |
| **コンポーネント** | `TestListPage` (deleteMode=true) |
| **目的** | 複数テストの一括選択・削除 |

### レイアウト

```
ページヘッダー: "A/Bテスト" (text-xl)  [絞り込み すべて ∨] [テストを選択] [+ 新規テスト]
ツールバー: "n件を選択中" (mono, text-mid)  [キャンセル] [n件を削除 🗑]
検索バー: (通常モードと同じ)
─────────────────────────────────────────────────
シンプルリスト (hairline 区切り):
  各行: ☑ チェックボックス + テスト名 (左)         相対日付 (右)
  選択行: accent-dim 背景ハイライト
```

### 構成要素

| 要素 | 仕様 |
|---|---|
| チェックボックス | 16×16, 角丸 3px。未選択=stroke text-lo。選択=fill accent + check アイコン white |
| 削除ボタン | bg-transparent, border-danger, text-danger, trash-2 アイコン |
| キャンセルボタン | bg-transparent, border-hairline, text-mid |
| 選択カウンター | font-mono text-sm text-mid |
| 選択行 | bg accent-dim |

### インタラクション

- チェックボックスクリック → 行の選択/解除
- [n件削除] → 確認ダイアログ後、選択テストを `DELETE /tests/:id` で順次削除
- [キャンセル] → 通常モードに戻る

---

## S9-一覧: 設定モーダル

| 項目 | 値 |
|---|---|
| **画面 ID** | S9-一覧 |
| **Pencil Node** | Q0zxw |
| **URL** | (モーダル。任意画面上に表示) |
| **コンポーネント** | `SettingsModal` |
| **目的** | Figma 連携・AI モデル・プロンプト管理 |

### レイアウト

```
モーダル (bg-surface, 角丸 lg, width ~720px)
┌──────────────┬──────────────────────────────────┐
│ 左ナビ        │ コンテンツエリア                   │
│ (width 180px) │                                  │
│  一般          │  プロンプトテンプレート             │
│  Figma 連携    │    ペルソナ評価 → (ドリルイン)     │
│  AI モデル     │    理由要約   → (ドリルイン)       │
│  プロンプト ✓  │    インタビュー → (ドリルイン)     │
│               │    AI 下書き  → (ドリルイン)       │
└──────────────┴──────────────────────────────────┘
```

### 構成要素

| 要素 | 仕様 |
|---|---|
| オーバーレイ | bg-black/50 |
| モーダル本体 | bg-surface, 角丸 lg |
| 左ナビ項目 | text-sm text-mid。アクティブ = text-accent + font-semibold |
| セクションタイトル | text-lg font-sans text-hi |
| テンプレート行 | text-sm text-hi。hover=bg-raised。右矢印アイコン text-lo |

### インタラクション

- 左ナビクリック → 右コンテンツを切替
- テンプレート行クリック → S9-詳細へドリルイン遷移
- ESC / オーバーレイクリック → モーダルを閉じる

---

## S9-詳細: 設定モーダル（プロンプト詳細）

| 項目 | 値 |
|---|---|
| **画面 ID** | S9-詳細 |
| **Pencil Node** | mPqSL |
| **URL** | (モーダル内ドリルイン) |
| **コンポーネント** | `SettingsModal` (drillIn=true) |
| **目的** | 個別プロンプトテンプレートの閲覧・追加指示の編集 |

### レイアウト

```
モーダル内 (左ナビ維持):
  ヘッダー: [← 戻る] + "プロンプトテンプレート" + テンプレート名
  ─────────────────────
  "ペルソナ評価" (text-lg, text-hi)
  説明文 (text-sm, text-mid)
  ─────────────────────
  セクション: 固定コンテキスト (読み取り専用)
    bg-raised, font-mono text-xs text-mid
  ─────────────────────
  セクション: 固定指示 (読み取り専用)
    bg-raised, font-mono text-xs text-mid
  ─────────────────────
  セクション: 追加指示 (編集可能)
    テキストエリア bg-raised, font-mono text-xs text-hi
  ─────────────────────
  フッター: 文字数カウント + [保存] ボタン (accent)
```

### 構成要素

| 要素 | 仕様 |
|---|---|
| 戻るボタン | ← アイコン + "プロンプトテンプレート" text-sm text-accent |
| 固定セクション | bg-raised, border なし, 角丸 sm。内容は font-mono text-xs text-mid |
| 編集セクション | bg-raised, border accent (focus 時), 角丸 sm。font-mono text-xs text-hi |
| 保存ボタン | bg-transparent, border-hairline, text-hi, 角丸 sm |

### インタラクション

- [← 戻る] → S9-一覧に戻る（モーダルは閉じない）
- 追加指示を編集 → テキスト変更
- [保存] → `PUT /api/settings` で永続化

---

## S10: About モーダル

| 項目 | 値 |
|---|---|
| **画面 ID** | S10 |
| **Pencil Node** | JX8mk |
| **URL** | (モーダル。任意画面上に表示) |
| **コンポーネント** | `AboutModal` (AppLayout 内) |
| **目的** | アプリ名・バージョン・ビルド情報の表示 |

### レイアウト

```
モーダル (bg-surface, 角丸 lg, width 320px, 中央揃え)
  [×] 閉じるボタン (右上)
  ┌─────────┐
  │    C    │  ← アプリアイコン (bg-base, 角丸 18px, 72×72)
  └─────────┘
  "Chorus" (text-xl font-sans font-bold text-hi)
  "AI PERSONA REVIEW" (text-xs font-mono text-lo, tracking-widest)
  "バージョン 0.0.1 (0f8b632)" (text-xs font-mono text-lo)
```

### 構成要素

| 要素 | 仕様 |
|---|---|
| オーバーレイ | bg-black/50 |
| モーダル本体 | bg-surface, 角丸 lg, width 320px, padding 32px 40px |
| アイコン | 72×72, bg-base, 角丸 18px。中央に "C" text-4xl font-bold text-hi |
| 閉じるボタン | 右上 24×24, hover=bg-raised, × アイコン text-lo |

### インタラクション

- [×] / オーバーレイクリック → モーダルを閉じる
- ESC キー → モーダルを閉じる

---

## 画面遷移図

```
/signin ──認証成功──→ /personas (S1)
                        │
                        ├── カードクリック → /personas/:id (S6-詳細, デフォルト)
                        │                    ├── 編集タブ → S6-編集
                        │                    └── インタビュータブ → S6-インタビュー
                        ├── カード `...` → コンテキストメニュー（複製 / 削除）
                        ├── [+新規ペルソナ] → /personas/new
                        │
                        ├── ナビ「新規A/Bテスト」→ /tests/new (S4)
                        │     └── ペルソナ変更 → S5 モーダル
                        │     └── [作成して実行] → /tests/:id/running (S3)
                        │                            └── 完了 → S3 完了状態（「結果を見る」ボタン）
                        │                                  └── [結果を見る] → /tests/:id/report (S2)
                        │
                        └── ナビ「A/Bテスト」→ /results (S8)
                              └── 行クリック → S2 or S3

AccountMenu (全画面共通):
  設定 → S9 モーダル → S9-詳細 (ドリルイン)
  About → S10 モーダル
  サインアウト → /signin
```
