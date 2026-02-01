import { streamKimi, KimiError } from "@/lib/kimi";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { prompt, systemPrompt, maxTokens } = await req.json();
    const response = await streamKimi({ prompt, systemPrompt, maxTokens });

    if (!response.body) {
      return new Response(JSON.stringify({ error: "No response body" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Transform the stream to extract content and reasoning
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
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

                  if (delta || usage) {
                    const event = {
                      content: delta?.content || "",
                      reasoning: delta?.reasoning_content || "",
                      usage: usage || null,
                    };
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
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
    if (e instanceof KimiError) {
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
