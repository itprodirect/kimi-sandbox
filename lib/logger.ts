import { appendFileSync, existsSync, mkdirSync, readFileSync } from "fs";
import { join } from "path";

export interface LogEntry {
  id: string;
  timestamp: string;
  model: string;
  template?: string;
  prompt: string;
  systemPrompt?: string;
  maxTokens: number;
  content: string;
  reasoningContent?: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  durationMs: number;
  error?: string;
}

const LOGS_DIR = join(process.cwd(), "logs");
const LOG_FILE = join(LOGS_DIR, "responses.jsonl");

function ensureLogsDir() {
  if (!existsSync(LOGS_DIR)) {
    mkdirSync(LOGS_DIR, { recursive: true });
  }
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function logResponse(entry: Omit<LogEntry, "id" | "timestamp">): LogEntry {
  ensureLogsDir();

  const fullEntry: LogEntry = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    ...entry,
  };

  appendFileSync(LOG_FILE, JSON.stringify(fullEntry) + "\n", "utf-8");

  return fullEntry;
}

export function readLogs(limit?: number): LogEntry[] {
  ensureLogsDir();

  if (!existsSync(LOG_FILE)) {
    return [];
  }

  const content = readFileSync(LOG_FILE, "utf-8");
  const lines = content.trim().split("\n").filter(Boolean);

  const entries = lines.map((line) => {
    try {
      return JSON.parse(line) as LogEntry;
    } catch {
      return null;
    }
  }).filter((e): e is LogEntry => e !== null);

  // Return most recent first
  const sorted = entries.reverse();

  if (limit) {
    return sorted.slice(0, limit);
  }

  return sorted;
}

export function getLogStats() {
  const logs = readLogs();

  if (logs.length === 0) {
    return {
      totalRequests: 0,
      totalTokens: 0,
      avgDurationMs: 0,
      byTemplate: {},
    };
  }

  const totalTokens = logs.reduce((sum, l) => sum + (l.usage?.total_tokens || 0), 0);
  const totalDuration = logs.reduce((sum, l) => sum + (l.durationMs || 0), 0);

  const byTemplate: Record<string, number> = {};
  for (const log of logs) {
    const key = log.template || "(custom)";
    byTemplate[key] = (byTemplate[key] || 0) + 1;
  }

  return {
    totalRequests: logs.length,
    totalTokens,
    avgDurationMs: Math.round(totalDuration / logs.length),
    byTemplate,
  };
}
