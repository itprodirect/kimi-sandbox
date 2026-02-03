# Architecture

## Overview

The sandbox provides a unified interface for comparing LLM outputs across providers (Kimi, OpenAI). All API traffic is server-side to protect keys.

## Request Flow

```
Browser (React UI)
  │
  │  POST /api/{provider}/stream
  │  { prompt, messages, maxTokens, model }
  │
  ▼
API Route (Next.js, Node.js runtime)
  │
  │  lib/{provider}.ts
  │  - Build messages array
  │  - Add auth headers
  │
  ▼
Provider API
  │
  │  SSE stream or JSON response
  │
  ▼
API Route
  │
  │  - Transform stream format
  │  - Log to JSONL
  │
  ▼
Browser receives streamed chunks
```

## Client Libraries

### lib/kimi.ts
- `callKimi(req)` — Non-streaming completion
- `streamKimi(req)` — Streaming completion
- Handles `reasoning_content` field unique to Kimi
- Temperature locked to `1` (API requirement)

### lib/openai.ts
- `callOpenAI(req)` — Non-streaming completion
- `streamOpenAI(req)` — Streaming completion
- Standard OpenAI Chat Completions format
- `stream_options.include_usage` for token stats

### lib/logger.ts
- `logResponse(entry)` — Append to `logs/responses.jsonl`
- `readLogs(limit)` — Read recent entries
- `getLogStats()` — Aggregate stats

### lib/prompts.ts
- `loadTemplate(name)` — Read from `prompts/*.md`
- `interpolate(template, vars)` — Replace `{{VAR}}` placeholders
- `listTemplates()` — List available templates

## API Routes

```
/api/kimi              POST  Non-streaming Kimi
/api/kimi/stream       POST  Streaming Kimi (SSE)
/api/openai            POST  Non-streaming OpenAI
/api/openai/stream     POST  Streaming OpenAI (SSE)
/api/templates         GET   List templates or load by name
/api/logs              GET   View logs, ?stats=true for aggregates
```

## Pages

### / (Templates)
Single-shot prompts with template selection. Good for testing individual prompt patterns.

### /chat (Multi-turn)
Conversation interface with history. Tests context retention across turns.

### /compare (A/B)
Side-by-side model comparison. Select multiple models, run same prompt in parallel.

## Streaming Format

All streaming endpoints emit normalized SSE:

```
data: {"content":"...", "reasoning":"...", "usage":null}
data: {"content":"", "reasoning":"", "usage":{"prompt_tokens":X, "completion_tokens":Y, "total_tokens":Z}}
data: [DONE]
```

- `content` — Main response text delta
- `reasoning` — Kimi's chain-of-thought delta (empty for OpenAI)
- `usage` — Token counts (sent at end of stream)

## Logging

All requests are logged to `logs/responses.jsonl`:

```json
{
  "id": "1234567890-abc123",
  "timestamp": "2026-02-01T20:30:00.000Z",
  "model": "kimi-k2.5",
  "template": "planner",
  "prompt": "...",
  "content": "...",
  "reasoningContent": "...",
  "usage": {"prompt_tokens": 100, "completion_tokens": 500, "total_tokens": 600},
  "durationMs": 3500
}
```

## Multi-Model Strategy

```
┌──────────────┐     ┌──────────────┐
│    Kimi      │     │   OpenAI     │
│  (cheap)     │     │  (quality)   │
└──────────────┘     └──────────────┘
        │                   │
        └─────────┬─────────┘
                  │
          A/B Comparison
                  │
                  ▼
         Pick best for task
```

Use the `/compare` page to find the right model for each task type:
- Kimi excels at planning, first drafts, brainstorming
- OpenAI models better for complex reasoning, precision tasks
- Log outputs to build evidence for model selection decisions
