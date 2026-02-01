import { NextResponse } from "next/server";
import { callKimi, KimiError, ChatMessage } from "@/lib/kimi";
import { logResponse } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const startTime = Date.now();

  try {
    const { prompt, messages, systemPrompt, maxTokens, template } = await req.json();
    const result = await callKimi({ prompt, messages, systemPrompt, maxTokens });
    const durationMs = Date.now() - startTime;

    // Get prompt for logging (last user message or single prompt)
    const logPrompt = messages
      ? (messages as ChatMessage[]).filter((m: ChatMessage) => m.role === "user").pop()?.content ?? ""
      : prompt;

    // Log successful response
    logResponse({
      model: "kimi-k2.5",
      template,
      prompt: logPrompt,
      systemPrompt,
      maxTokens: maxTokens || 5000,
      content: result.content,
      reasoningContent: result.reasoningContent,
      usage: result.usage,
      durationMs,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const durationMs = Date.now() - startTime;

    if (e instanceof KimiError) {
      logResponse({
        model: "kimi-k2.5",
        prompt: "",
        maxTokens: 0,
        content: "",
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        durationMs,
        error: e.message,
      });

      return NextResponse.json(
        { ok: false, error: e.message, raw: e.raw },
        { status: e.status ?? 500 }
      );
    }
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
