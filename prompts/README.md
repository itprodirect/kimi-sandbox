# Prompt Templates

Reusable prompts optimized for Kimi 2.5. Each template uses `{{VARIABLE}}` placeholders that get interpolated at runtime.

## Available Templates

| Template | Use Case | Expected Tokens |
|----------|----------|-----------------|
| `planner` | Starting new features, file trees, build order | 200-400 |
| `refactor` | Structural improvements without behavior changes | 300-500 |
| `reviewer` | Quick PR sanity check | 150-300 |
| `synthesizer` | Comparing approaches, tradeoffs | 200-350 |
| `commit` | Generate conventional commit messages | 30-50 |
| `test` | Generate test case scaffolds | 200-400 |

## Usage

```typescript
import { loadAndInterpolate } from "@/lib/prompts";
import { callKimi } from "@/lib/kimi";

const prompt = loadAndInterpolate("planner", {
  DESCRIPTION: "PDF upload endpoint with vector storage",
  STACK: "Next.js 16, TypeScript, Pinecone",
  CONSTRAINTS: "- Server-side only\n- Max 10MB upload",
});

const result = await callKimi({ prompt });
```

## Adding New Templates

1. Create `prompts/your-template.md`
2. Use `{{VARIABLE_NAME}}` for placeholders (SCREAMING_SNAKE_CASE)
3. Keep prompts concise — every token costs money
4. Add entry to this README

## Tips

- **Default max_tokens: 500** — increase to 1000 only for planner/refactor
- **Chain, don't stuff** — run Planner → Refactor → Review as separate calls
- **Strip filler** — Kimi charges per token, keep prompts lean
