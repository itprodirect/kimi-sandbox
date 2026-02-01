import { NextResponse } from "next/server";
import { listTemplates, loadTemplate } from "@/lib/prompts";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name");

  if (name) {
    try {
      const content = loadTemplate(name);
      const variables = extractVariables(content);
      return NextResponse.json({ ok: true, name, content, variables });
    } catch (e) {
      return NextResponse.json(
        { ok: false, error: e instanceof Error ? e.message : "Template not found" },
        { status: 404 }
      );
    }
  }

  const templates = listTemplates();
  return NextResponse.json({ ok: true, templates });
}

function extractVariables(content: string): string[] {
  const matches = content.match(/\{\{(\w+)\}\}/g) || [];
  const unique = [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, "")))];
  return unique;
}
