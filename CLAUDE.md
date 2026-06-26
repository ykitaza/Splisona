# Agentic SDLC and Spec-Driven Development

Kiro-style Spec-Driven Development on an agentic SDLC

## Project Context

### Paths
- Steering: `.kiro/steering/`
- Specs: `.kiro/specs/`

### Steering vs Specification

**Steering** (`.kiro/steering/`) - Guide AI with project-wide rules and context
**Specs** (`.kiro/specs/`) - Formalize development process for individual features

### Active Specifications
- Check `.kiro/specs/` for active specifications
- Use `/kiro:spec-status [feature-name]` to check progress

## Development Guidelines
- Think in English, generate responses in Japanese. All Markdown content written to project files (e.g., requirements.md, design.md, tasks.md, research.md, validation reports) MUST be written in the target language configured for this specification (see spec.json.language).

## Minimal Workflow
- Phase 0 (optional): `/kiro:steering`, `/kiro:steering-custom`
- Phase 1 (Specification):
  - `/kiro:spec-init "description"`
  - `/kiro:spec-requirements {feature}`
  - `/kiro:validate-gap {feature}` (optional: for existing codebase)
  - `/kiro:spec-design {feature} [-y]`
  - `/kiro:validate-design {feature}` (optional: design review)
  - `/kiro:spec-tasks {feature} [-y]`
- Phase 2 (Implementation): `/kiro:spec-impl {feature} [tasks]`
  - `/kiro:validate-impl {feature}` (optional: after implementation)
- Progress check: `/kiro:spec-status {feature}` (use anytime)

## Development Rules
- 3-phase approval workflow: Requirements → Design → Tasks → Implementation
- Human review required each phase; use `-y` only for intentional fast-track
- Keep steering current and verify alignment with `/kiro:spec-status`
- Follow the user's instructions precisely, and within that scope act autonomously: gather the necessary context and complete the requested work end-to-end in this run, asking questions only when essential information is missing or the instructions are critically ambiguous.

## Steering Configuration
- Load entire `.kiro/steering/` as project memory
- Default files: `product.md`, `tech.md`, `structure.md`
- Custom files are supported (managed via `/kiro:steering-custom`)

## Design Policy — Chorus UI (Linear/Stripe 系)

Chorus の UI デザイン（`design/pencil-new.pen`）は Linear/Stripe の設計思想に従う。世界観は「無彩の管制室 × 発光する人格」。詳細トークンは memory `chorus-dark-redesign` 参照。

### レイアウトの最優先ルール：脱・箱（de-box）
- **全要素を囲み枠カード（bg-surface＋罫＋角丸）に入れない。** これは AI が陥る最大の悪癖であり Linear/Stripe が最も嫌う構図。
- 領域は **余白・hairline（細い罫）・タイポ階層** で分ける。box では分けない。
- カード（囲み枠）を使うのは「**それ自体が独立したオブジェクト**」のときだけ（例：比較対象のデザイン画像、データ表など）。見出し＋内容の塊は bg-base に直置きする。
- 1 画面に**主役（hero）を1つ**立て、他は従にする。同じ視覚的重みの箱を並べない。
- セクション間は**たっぷりの余白**で息をさせる。必要なら full-width の hairline で「台帳（ledger）」的に仕切る。
- コンテンツは紙面（bg-base）の上に置く。装飾のための塗り・影・角丸・グラデは足さない。

### その他の規律
- **発光は「人格」だけに限定。** 檻側（ブランド・チップ・勝者枠など UI シャーシ）にグローを付けない。glow は弱め（blur≤12 / 低 alpha）。
- 🏆👑 等のゲーミフィ装飾は使わない。階層は**色とタイポ**で作る。
- 配色は無彩3階層＋単一アクセント＋セマンティック少数。すべてくすませる（過彩度 NG）。
- spacing/type は **4/8 グリッドのトークン**に必ずスナップ（`space-*` / `text-*`）。場当たりの px を散らさない。
- 数値・ID・スコアは必ず Mono。罫線で囲わず明度差で領域化。
- 評価対象の外部物（アップ画像など）のみパレット外を許容。

### 検証
- 成果物は報告前に自己批評する（甘い自己評価 NG）。特に「箱を積んだだけのダッシュボード」になっていないかを毎回チェックする。
