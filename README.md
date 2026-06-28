# Splisona

AI ペルソナを使った A/B テスト評価プラットフォーム。複数の AI ペルソナがデザイン案を評価し、定量スコアとレポートを生成します。

<video src="https://github.com/user-attachments/assets/532a9c1c-2beb-4755-a4f2-5bc67ea4062a" controls width="600"></video>

## Tech Stack

- **Frontend** — React 19 + Vite + Tailwind CSS
- **Backend** — Hono (Cloudflare Workers)
- **Database** — Cloudflare D1
- **Storage** — Cloudflare R2
- **AI** — Gemini 2.5 Flash / Workers AI

## Setup

```bash
pnpm install
pnpm db:init
```

## Development

```bash
pnpm dev:backend   # Backend on :3001
pnpm dev:frontend  # Frontend on :5173
```

## Test

```bash
pnpm test
```

## License

[MIT](LICENSE)
