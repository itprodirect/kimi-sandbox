# Next Steps

## Completed

### Phase 1: Stabilization ✅
- [x] Confirm route.ts works (temperature=1, error handling)
- [x] Add .gitignore entries
- [x] Add docs (README, ARCHITECTURE, NEXT_STEPS, PROMPTS)
- [x] Tag release v0.1.0
- [x] Push to remote

### Phase 2: Abstraction ✅
- [x] Create `lib/kimi.ts` with typed interfaces
- [x] Create `lib/prompts.ts` for template loading
- [x] Create `lib/tokens.ts` for usage tracking
- [x] Simplify route.ts to use client library

### Phase 3: Prompt Templates ✅
- [x] Create `prompts/` directory
- [x] Add planner, refactor, reviewer, synthesizer, commit, test templates
- [x] Add prompts/README.md

### Phase 4: UI Enhancements ✅
- [x] Template selector dropdown
- [x] Dynamic variable input fields
- [x] Token usage display
- [x] Streaming support with real-time output
- [x] Reasoning content display (Kimi)

### Phase 5: Response Logging ✅
- [x] Create `lib/logger.ts`
- [x] Log all requests to JSONL
- [x] Add `/api/logs` endpoint for viewing

### Phase 6: Multi-turn Conversations ✅
- [x] Update Kimi client for messages array
- [x] Create `/chat` page with conversation history
- [x] Collapsible reasoning per message

### Phase 7: Multi-Model Support ✅
- [x] Create `lib/openai.ts` client
- [x] Add `/api/openai` and `/api/openai/stream` routes
- [x] Create `/compare` page for A/B testing
- [x] Model selector grouped by provider

---

## In Progress

### Model Parameter Tuning
- [ ] Test and validate all model IDs work with APIs
- [ ] Handle model-specific parameters (some models don't support streaming)
- [ ] Add error handling for unsupported model features

---

## Future

### Retry with Exponential Backoff
Create `lib/retry.ts`:
- Automatic retry on rate limits (429)
- Exponential backoff with jitter
- Configurable max retries

### Logs Viewer UI
- Browse/search/filter logged responses
- Compare responses visually
- Export filtered results

### System Prompt Customization
- Allow editing system prompt in UI
- Save custom system prompts

### Conversation Persistence
- Save/load chat sessions
- LocalStorage or database backend

### Additional Providers
- Anthropic (Claude)
- Google (Gemini)
- Local models (Ollama)

### Cost Tracking
- Estimate cost per request based on token pricing
- Cumulative cost tracking in logs

### Shared Utilities Package
Extract common code into `packages/ai-kit/`:
```
packages/ai-kit/
├─ env.ts          ← Env loader + validation
├─ retry.ts        ← Exponential backoff
├─ tokens.ts       ← Token/cost tracking
├─ redact.ts       ← Strip keys/PII from logs
└─ index.ts
```

This becomes shareable across projects:
- kimi-sandbox (this repo)
- Other AI projects

---

## Version History

| Version | Date | Summary |
|---------|------|---------|
| v0.1.0 | 2026-02-01 | Initial Kimi integration |
| v0.2.0 | 2026-02-01 | Templates, streaming, logging, chat, A/B compare |
