# Next Steps

## Phase 1: Stabilization

**Goal:** Lock down what works. Clean commit history. No new features.

- [ ] Confirm `route.ts` matches the canonical version in this repo (temperature=1, error handling, runtime directive)
- [ ] Remove `public/src/` if it's scaffolding noise (currently untracked)
- [ ] Add `.gitignore` entries: `.env.local`, `.next/`, `node_modules/`, `.turbo/`
- [ ] Verify `.env.local` is not tracked (`git ls-files --error-unmatch .env.local` should fail)
- [ ] Add these docs to the repo: `README.md`, `ARCHITECTURE.md`, `NEXT_STEPS.md`, `PROMPTS.md`
- [ ] Tag release: `git tag v0.1.0 -m "Working Kimi 2.5 integration"`
- [ ] Push to remote

## Phase 2: Abstraction (`lib/kimi.ts`)

**Goal:** Extract reusable Kimi client from the route handler.

Create `lib/kimi.ts`:

```ts
interface KimiRequest {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
}

interface KimiResponse {
  content: string;
  reasoningContent?: string;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  raw: any;
}

export async function callKimi(req: KimiRequest): Promise<KimiResponse> { ... }
```

Then simplify `route.ts` to:

```ts
import { callKimi } from "@/lib/kimi";

export async function POST(req: Request) {
  const { prompt } = await req.json();
  const result = await callKimi({ prompt });
  return NextResponse.json(result);
}
```

Additional `lib/` utilities:
- `lib/kimi.ts` — core client
- `lib/prompts.ts` — template loader (reads from `prompts/` directory)
- `lib/tokens.ts` — usage tracker (log to console or file, no DB yet)

## Phase 3: Prompt Templates

**Goal:** Ship reusable prompt templates optimized for Kimi's strengths and token limits.

Create `prompts/` directory:

```
prompts/
├─ planner.md       ← Implementation planning
├─ refactor.md      ← Code refactoring analysis
├─ reviewer.md      ← Code review checklist
├─ synthesizer.md   ← Idea comparison / brainstorming
└─ README.md        ← How to add new templates
```

Each template is a Markdown file with `{{variable}}` placeholders. `lib/prompts.ts` loads and interpolates them at runtime.

UI enhancement: dropdown or tab selector to pick a prompt template before sending.

See `PROMPTS.md` for the initial template library.

## Phase 4: Repo Cloning Strategy

**Goal:** Make this repo the seed for every new AI project.

### Clone-and-Configure Pattern

```bash
# New project from template
cp -r kimi-sandbox/ new-project/
cd new-project/
rm -rf .git && git init
# Update .env.local with project-specific keys
# Swap system prompts as needed
```

### Shared Utilities Package (Future)

Extract common code into `packages/ai-kit/`:

```
packages/ai-kit/
├─ env.ts          ← Env loader + validation
├─ retry.ts        ← Exponential backoff
├─ tokens.ts       ← Token/cost tracking
├─ redact.ts       ← Strip keys/PII from logs
└─ index.ts
```

This becomes a git submodule or local package shared across:
- `kimi-sandbox` (this repo)
- `mm-image-studio` (image generation/editing)
- `pdf-rag-ingestor` (document pipeline)
- `voice-agent-triage` (realtime voice)
- `image-rag-feedback-analyzer` (multimodal RAG)
- `video-to-voiceover` (frame extraction + narration)

### Per-Repo Customization Points

| What changes | Where |
|---|---|
| API provider + model | `.env.local` + `lib/kimi.ts` (or new `lib/openai.ts`) |
| System prompt | `prompts/*.md` |
| Route shape | `app/api/*/route.ts` |
| UI | `app/page.tsx` |

Everything else (env loading, error handling, token tracking, retry logic) stays shared.

## Phase 5: Multi-Model Orchestration (Stretch)

**Goal:** Route prompts to different models based on task type.

```
app/api/plan/route.ts    → Kimi (cheap)
app/api/build/route.ts   → Claude (precise)
app/api/review/route.ts  → Codex (thorough)
```

Orchestrator pattern: a single `/api/run` endpoint that accepts `{ task, prompt }` and routes to the right model. Not needed yet — build this only when you have 2+ providers wired up.
