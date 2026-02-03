# Prompt Templates

Reusable prompts optimized for Kimi 2.5. Designed for low token cost, high signal output.

All prompts assume the system message: `"You are a senior software engineer. Be concise and practical."`

---

## 1. Planner

**Use when:** Starting a new feature, repo, or integration. You want a file tree + step-by-step build order.

```
I need to build: {{DESCRIPTION}}

Stack: {{STACK}}

Constraints:
- {{CONSTRAINT_1}}
- {{CONSTRAINT_2}}

Produce:
1. File tree (only files that need to exist)
2. Build order (which file to create first, and why)
3. For each file: one-sentence description of its responsibility
4. Known risks or gotchas

No boilerplate. No explanations of the stack. Just the plan.
```

**Expected output:** ~200-400 tokens. Structured, actionable, ready for Claude Code.

**Example invocation:**
```json
{
  "prompt": "I need to build: a PDF upload endpoint that extracts text and stores chunks in a vector DB.\n\nStack: Next.js 16 App Router, TypeScript, Pinecone, pdf-parse\n\nConstraints:\n- Server-side only\n- Max 10MB upload\n- Chunk size 500 tokens with 50-token overlap\n\nProduce:\n1. File tree\n2. Build order\n3. Per-file responsibility\n4. Known risks"
}
```

---

## 2. Refactor Advisor

**Use when:** You have working code that's messy. You want structural improvements without changing behavior.

```
Here is a working file that needs refactoring:

```{{LANGUAGE}}
{{CODE}}
```

Requirements:
- Do not change external behavior
- Do not add dependencies
- Prioritize readability and maintainability

Produce:
1. List of specific issues (max 5)
2. Refactored code
3. One sentence explaining what changed and why
```

**Expected output:** ~300-500 tokens. Issues list + clean code block.

**Tip:** Kimi is good at spotting repetition, missing error handling, and naming issues. For deep architectural refactors, escalate to Claude.

---

## 3. Code Reviewer

**Use when:** You want a quick sanity check before committing. Catches surface issues cheaply.

```
Review this code for a PR:

```{{LANGUAGE}}
{{CODE}}
```

Check for:
- [ ] Error handling gaps
- [ ] Security issues (key leaks, injection, unvalidated input)
- [ ] Type safety problems
- [ ] Dead code or unused imports
- [ ] Naming clarity

Format: checklist with pass/fail per item. For each fail, quote the line and suggest a fix.
Do not comment on style preferences. Only flag real problems.
```

**Expected output:** ~150-300 tokens. Tight checklist.

**Important:** This is a first-pass review. For security-sensitive code, always follow up with Claude or Codex.

---

## 4. Synthesizer

**Use when:** Comparing approaches, brainstorming, or evaluating tradeoffs.

```
I'm deciding between these approaches for {{PROBLEM}}:

A: {{APPROACH_A}}
B: {{APPROACH_B}}
{{#if APPROACH_C}}C: {{APPROACH_C}}{{/if}}

Context: {{CONTEXT}}

Produce a comparison table with columns:
- Approach
- Pros (max 3)
- Cons (max 3)  
- When to pick it
- Estimated effort (low/med/high)

Then: one-sentence recommendation with reasoning.
```

**Expected output:** ~200-350 tokens. Table + verdict.

---

## 5. Commit Message Writer

**Use when:** You have a diff and need a conventional commit message.

```
Write a conventional commit message for this diff:

```diff
{{DIFF}}
```

Format: type(scope): description

Rules:
- type: feat, fix, refactor, docs, chore, test
- scope: the module or file area affected
- description: imperative mood, lowercase, no period, max 72 chars
- Add body only if the "why" isn't obvious from the description
```

**Expected output:** ~30-50 tokens. One-liner or short body.

---

## 6. Test Scaffolder

**Use when:** You have a function and want test cases generated before writing the implementation.

```
Generate test cases for this function signature:

```{{LANGUAGE}}
{{FUNCTION_SIGNATURE}}
```

Context: {{WHAT_IT_DOES}}

Produce:
1. Happy path tests (2-3)
2. Edge cases (2-3)  
3. Error cases (1-2)

Format: describe/it blocks with clear test names. Use placeholder assertions — I'll fill in expected values.
Do not implement the function. Tests only.
```

**Expected output:** ~200-400 tokens. Test skeleton ready for implementation.

---

## Usage Tips

**Keep prompts short.** Kimi charges per token. Every word in your prompt costs money (even if small). Strip filler.

**Use `max_tokens: 500`** as default. Increase to 1000 only for planner/refactor tasks. Most templates produce useful output well under 500.

**Chain, don't stuff.** Instead of one massive prompt, run Planner → then Refactor → then Review as separate calls. Cheaper per-call, better results, easier to debug.

**Template variables** use `{{DOUBLE_BRACES}}`. When `lib/prompts.ts` is built (Phase 3), these will be interpolated automatically. Until then, manually replace before sending.
