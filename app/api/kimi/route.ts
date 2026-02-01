import { NextResponse } from "next/server";
import { callKimi, KimiError } from "@/lib/kimi";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { prompt, systemPrompt, maxTokens } = await req.json();
    const result = await callKimi({ prompt, systemPrompt, maxTokens });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof KimiError) {
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
