import { NextResponse } from "next/server";
import { readLogs, getLogStats } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const stats = searchParams.get("stats") === "true";
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  if (stats) {
    return NextResponse.json({ ok: true, ...getLogStats() });
  }

  const logs = readLogs(limit);
  return NextResponse.json({ ok: true, logs, count: logs.length });
}
