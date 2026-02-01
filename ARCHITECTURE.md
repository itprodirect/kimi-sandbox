# Architecture

## App Router Flow

```
Browser (page.tsx)
  │
  │  POST /api/kimi  { prompt: "..." }
  │
  ▼
app/api/kimi/route.ts  (server-side, Node.js runtime)
  │
  │  POST https://api.moonshot.ai/v1/chat/completions
  │  Authorization: Bearer $MOONSHOT_API_KEY
  │
  ▼
Moonshot API  →  kimi-k2.5  →  response
  │
  ▼
Browser receives JSON  { ok, status, data }
```

All LLM traffic stays server-side. The client never sees or sends API keys. The route handler is the single point of contact with Moonshot.

## Why Server-Only

- API keys stay in `process.env`, never bundled into client JS
- Rate limiting and error handling happen in one place
- Easy to swap providers without touching the UI
- Moonshot's OpenAI-compatible endpoint means the fetch call is portable

## Why Kimi

Kimi 2.5 via Moonshot is chosen for a specific role: **cheap, fast, good-enough cognition** for tasks that don't justify Claude or GPT-4 pricing.

**What Kimi handles well:**
- Generating file trees and implementation plans
- First-draft code (to be refined by stronger models)
- Structured brainstorming and option enumeration
- Prompt drafting and iteration
- Code review checklists (surface-level)

**What Kimi should NOT handle:**
- Multi-file refactors requiring deep context
- Security-sensitive code review
- Final production code generation
- Complex architectural decisions

## Multi-Model Workflow

The sandbox is one node in a three-model pipeline:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Kimi 2.5   │ ──▶ │  Claude Code  │ ──▶ │    Codex      │
│  (planning)  │     │  (building)   │     │  (reviewing)  │
└──────────────┘     └──────────────┘     └──────────────┘
     cheap               precise              thorough
```

**Phase 1 — Kimi (Plan)**
Generate implementation plans, file trees, step-by-step instructions, prompt templates, and first-draft code. Cost: near zero.

**Phase 2 — Claude Code (Build)**
Take Kimi's plan as input. Apply multi-file diffs, resolve edge cases, run and fix failing tests. Cost: moderate, but high accuracy.

**Phase 3 — Codex (Review)**
Final pass: security audit, "what did we miss" checklist, simplification suggestions, code quality scoring. Cost: moderate.

**Feedback loop:** If Codex review surfaces issues, feed them back to Kimi for a cheap re-plan, then Claude Code for fixes. Only escalate to expensive models when Kimi's output is insufficient.

## Provider Quirks

| Constraint | Detail |
|---|---|
| `temperature` | Must be exactly `1` for `kimi-k2.5`. Any other value → HTTP 400. |
| Auth | Bearer token via `MOONSHOT_API_KEY` |
| Base URL | `https://api.moonshot.ai/v1` (OpenAI-compatible) |
| Streaming | Supported but not yet implemented in this sandbox |
| Rate limits | 500 RPM / 3M TPM / unlimited TPD on free tier |

## Future: Abstraction Layer

The current `route.ts` has inline fetch logic. Phase 2 will extract this into `lib/kimi.ts` with:
- Typed request/response interfaces
- Configurable system prompts
- Token usage tracking
- Error classification (auth vs. rate limit vs. model error)

See `NEXT_STEPS.md` for the full roadmap.
