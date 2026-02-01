# Kimi Sandbox

A lightweight Next.js sandbox for Moonshot's **Kimi 2.5** model. Designed as a reusable foundation for cheap LLM-powered planning, code review, refactoring guidance, and idea synthesis across multiple AI projects.

Kimi serves as the **low-cost cognitive engine**. Expensive models (Claude Opus, Codex) are reserved for final builds, reviews, and multi-file diffs.

## Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript
- **UI:** Tailwind CSS (default scaffold)
- **LLM Provider:** Moonshot (`kimi-k2.5`)
- **Auth:** API key via `.env.local`

## Quick Start

```bash
git clone <your-repo-url>
cd kimi-sandbox
npm install
```

### Configure Environment

Create `.env.local` in the project root:

```env
MOONSHOT_API_KEY=your-key-here
MOONSHOT_BASE=https://api.moonshot.ai/v1
```

> Source of truth for keys: **LastPass**. Never commit `.env.local`.

### Run

```bash
npm run dev
```

### Test the API

```bash
curl -X POST http://localhost:3000/api/kimi \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Say OK"}'
```

Expected: `200` with `data.choices[0].message.content` populated.

### Use the UI

Open `http://localhost:3000`. Type a prompt, hit send. Response renders below the input.

## API Route

`POST /api/kimi` — accepts `{ "prompt": "..." }`, returns Moonshot chat completion response.

Key constraint: **`temperature` must be exactly `1`** for `kimi-k2.5`. Moonshot rejects any other value with HTTP 400.

## Intended Use Cases

- **Planning:** Generate implementation plans, file trees, step-by-step build sequences
- **Refactoring:** Analyze existing code and suggest structural improvements
- **Code Review:** Cheap first-pass review before expensive model review
- **Idea Synthesis:** Brainstorm, compare approaches, generate outlines

## Project Structure

```
kimi-sandbox/
├─ app/
│  ├─ api/kimi/route.ts   ← Server-side Moonshot proxy
│  ├─ page.tsx             ← Simple prompt UI
│  ├─ layout.tsx
│  ├─ globals.css
│  └─ favicon.ico
├─ .env.local              ← API keys (gitignored)
├─ package.json
└─ README.md
```

## Rate Limits (Free Tier)

| Metric      | Limit     |
|-------------|-----------|
| Concurrency | 100       |
| RPM         | 500       |
| TPM         | 3,000,000 |
| TPD         | Unlimited |

## License

Private — internal use only.
