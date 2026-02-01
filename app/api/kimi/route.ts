import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    const apiKey = process.env.MOONSHOT_API_KEY;
    const base = process.env.MOONSHOT_BASE || "https://api.moonshot.ai/v1";

    if (!apiKey) {
      return NextResponse.json({ error: "Missing MOONSHOT_API_KEY" }, { status: 500 });
    }

    const resp = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "kimi-k2.5",
        messages: [
          { role: "system", content: "You are a senior software engineer. Be concise and practical." },
          { role: "user", content: String(prompt ?? "") },
        ],
        max_tokens: 500,
        temperature: 1
      }),
    });

    const data = await resp.json();
    return NextResponse.json({ ok: resp.ok, status: resp.status, data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
