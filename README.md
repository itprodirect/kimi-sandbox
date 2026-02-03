# Kimi Sandbox

A Next.js sandbox for multi-model LLM comparison with Moonshot Kimi and OpenAI models. Designed as a reusable foundation for testing, comparing, and evaluating LLM outputs across providers.

## Features

- **A/B Model Comparison** - Run the same prompt through multiple models side-by-side
- **Multi-turn Chat** - Conversation history with context retention testing
- **Prompt Templates** - 6 reusable templates for common tasks
- **Streaming Responses** - Real-time output with reasoning display (Kimi)
- **Response Logging** - All responses logged to JSONL for analysis
- **Token Tracking** - Usage stats per request and cumulative

## Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript
- **UI:** Tailwind CSS
- **LLM Providers:** Moonshot (Kimi), OpenAI

## Quick Start

```bash
git clone https://github.com/itprodirect/kimi-sandbox.git
cd kimi-sandbox
npm install
```

### Configure Environment

Create `.env.local` in the project root:

```env
# Kimi / Moonshot
MOONSHOT_API_KEY=your-moonshot-key
MOONSHOT_BASE=https://api.moonshot.ai/v1

# OpenAI
OPENAI_API_KEY=your-openai-key
```

### Run

```bash
npm run dev
```

Open http://localhost:3000

## Pages

| Route | Purpose |
|-------|---------|
| `/` | Template-based single prompts |
| `/chat` | Multi-turn conversation |
| `/compare` | A/B model comparison |

## Available Models

### Kimi (Moonshot)
- Kimi K2
- Kimi K2.5 (with reasoning content)

### OpenAI
- GPT-4.1, GPT-4.1 Mini, GPT-4.1 Nano
- o3, o4 Mini (reasoning models)

## API Routes

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/kimi` | POST | Kimi completion |
| `/api/kimi/stream` | POST | Kimi streaming |
| `/api/openai` | POST | OpenAI completion |
| `/api/openai/stream` | POST | OpenAI streaming |
| `/api/templates` | GET | List/load prompt templates |
| `/api/logs` | GET | View response logs and stats |

## Prompt Templates

| Template | Use Case |
|----------|----------|
| `planner` | File trees, build order |
| `refactor` | Code improvement analysis |
| `reviewer` | PR review checklist |
| `synthesizer` | Compare approaches |
| `commit` | Conventional commit messages |
| `test` | Test case scaffolds |

## Docs And Benchmarks

- `docs/ARCHITECTURE.md` - Architecture overview
- `docs/NEXT_STEPS.md` - Roadmap and milestones
- `docs/PROMPTS.md` - Prompt template guidelines
- `docs/benchmarks/` - Benchmark inputs and repo lists
- `docs/sessions/` - Session logs for agentic work
- `reports/rr-eval/` - Raw benchmark reports and manifest

## Project Structure

```
kimi-sandbox/
|-- app/
|   |-- api/
|   |   |-- kimi/          <- Kimi API routes
|   |   |-- openai/        <- OpenAI API routes
|   |   |-- templates/     <- Template loader
|   |   `-- logs/          <- Log viewer
|   |-- chat/              <- Multi-turn chat page
|   |-- compare/           <- A/B comparison page
|   `-- page.tsx           <- Template UI
|-- docs/
|   |-- benchmarks/
|   |-- sessions/
|   |-- ARCHITECTURE.md
|   |-- NEXT_STEPS.md
|   `-- PROMPTS.md
|-- lib/
|   |-- kimi.ts            <- Kimi client
|   |-- openai.ts          <- OpenAI client
|   |-- logger.ts          <- Response logging
|   |-- prompts.ts         <- Template loader
|   `-- tokens.ts          <- Usage tracking
|-- prompts/               <- Markdown templates
|-- reports/
|   `-- rr-eval/            <- RepoRubric benchmark reports
|-- logs/                  <- Response logs (gitignored)
`-- .env.local             <- API keys (gitignored)
```

## Provider Notes

### Kimi
- `temperature` must be exactly `1` (API requirement)
- Returns `reasoning_content` field with chain-of-thought
- Free tier: 500 RPM / 3M TPM

### OpenAI
- Standard Chat Completions API
- Streaming with usage stats via `stream_options`

## License

Private - internal use only.
