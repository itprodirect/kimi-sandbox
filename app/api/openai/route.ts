import { NextResponse } from "next/server";
import { callOpenAI, OpenAIError, ChatMessage } from "@/lib/openai";
import { logResponse } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const startTime = Date.now();

  try {
    const { prompt, messages, systemPrompt, maxTokens, model, template } = await req.json();
    const result = await callOpenAI({ prompt, messages, systemPrompt, maxTokens, model });
    const durationMs = Date.now() - startTime;

    const logPrompt = messages
      ? (messages as ChatMessage[]).filter((m: ChatMessage) => m.role === "user").pop()?.content ?? ""
      : prompt;

    logResponse({
      model: result.model,
      template,
      prompt: logPrompt,
      systemPrompt,
      maxTokens: maxTokens || 5000,
      content: result.content,
      usage: result.usage,
      durationMs,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const durationMs = Date.now() - startTime;

    if (e instanceof OpenAIError) {
      logResponse({
        model: "openai",
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
