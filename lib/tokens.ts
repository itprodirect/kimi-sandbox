import { KimiUsage } from "./kimi";

export interface UsageEntry {
  timestamp: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  systemPrompt?: string;
  promptPreview: string;
}

const usageLog: UsageEntry[] = [];

export function trackUsage(
  usage: KimiUsage,
  prompt: string,
  systemPrompt?: string
): void {
  const entry: UsageEntry = {
    timestamp: new Date().toISOString(),
    prompt_tokens: usage.prompt_tokens,
    completion_tokens: usage.completion_tokens,
    total_tokens: usage.total_tokens,
    systemPrompt,
    promptPreview: prompt.slice(0, 100) + (prompt.length > 100 ? "..." : ""),
  };

  usageLog.push(entry);

  console.log(
    `[kimi] ${entry.timestamp} | ${usage.total_tokens} tokens (${usage.prompt_tokens} in, ${usage.completion_tokens} out)`
  );
}

export function getUsageLog(): UsageEntry[] {
  return [...usageLog];
}

export function getUsageSummary(): {
  totalCalls: number;
  totalTokens: number;
  avgTokensPerCall: number;
} {
  const totalCalls = usageLog.length;
  const totalTokens = usageLog.reduce((sum, e) => sum + e.total_tokens, 0);
  return {
    totalCalls,
    totalTokens,
    avgTokensPerCall: totalCalls > 0 ? Math.round(totalTokens / totalCalls) : 0,
  };
}

export function clearUsageLog(): void {
  usageLog.length = 0;
}
