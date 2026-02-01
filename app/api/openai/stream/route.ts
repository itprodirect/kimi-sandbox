import { streamOpenAI, OpenAIError, ChatMessage } from "@/lib/openai";
import { logResponse } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const startTime = Date.now();

  let requestData: {
    prompt?: string;
    messages?: ChatMessage[];
    systemPrompt?: string;
    maxTokens?: number;
    model?: string;
    template?: string;
  } = {};

  try {
    requestData = await req.json();
    const { prompt, messages, systemPrompt, maxTokens, model, template } = requestData;
    const response = await streamOpenAI({ prompt, messages, systemPrompt, maxTokens, model });

    if (!response.body) {
      return new Response(JSON.stringify({ error: "No response body" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let fullContent = "";
    let finalUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    let modelUsed = model || "gpt-4o";

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              const durationMs = Date.now() - startTime;
              const logPrompt = messages
                ? messages.filter((m) => m.role === "user").pop()?.content ?? ""
                : prompt ?? "";

              logResponse({
                model: modelUsed,
                template,
                prompt: logPrompt,
                systemPrompt,
                maxTokens: maxTokens || 5000,
                content: fullContent,
                usage: finalUsage,
                durationMs,
              });

              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed === "data: [DONE]") continue;

              if (trimmed.startsWith("data: ")) {
                try {
                  const json = JSON.parse(trimmed.slice(6));
                  const delta = json.choices?.[0]?.delta;
                  const usage = json.usage;

                  if (json.model) {
                    modelUsed = json.model;
                  }

                  if (delta?.content) {
                    fullContent += delta.content;
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ content: delta.content, reasoning: "", usage: null })}\n\n`)
                    );
                  }

                  if (usage) {
                    finalUsage = {
                      prompt_tokens: usage.prompt_tokens || 0,
                      completion_tokens: usage.completion_tokens || 0,
                      total_tokens: usage.total_tokens || 0,
                    };
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ content: "", reasoning: "", usage: finalUsage })}\n\n`)
                    );
                  }
                } catch {
                  // Skip malformed JSON
                }
              }
            }
          }
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    const durationMs = Date.now() - startTime;

    logResponse({
      model: "openai",
      prompt: "",
      maxTokens: 0,
      content: "",
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      durationMs,
      error: e instanceof Error ? e.message : "Unknown error",
    });

    if (e instanceof OpenAIError) {
      return new Response(
        JSON.stringify({ error: e.message, raw: e.raw }),
        { status: e.status ?? 500, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
