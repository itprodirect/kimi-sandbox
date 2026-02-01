import { trackUsage } from "./tokens";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface KimiRequest {
  prompt?: string;
  messages?: ChatMessage[];
  systemPrompt?: string;
  maxTokens?: number;
  model?: string;
  trackTokens?: boolean;
  stream?: boolean;
}

export interface KimiUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface KimiResponse {
  content: string;
  reasoningContent?: string;
  usage: KimiUsage;
  raw: unknown;
}

export class KimiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public raw?: unknown
  ) {
    super(message);
    this.name = "KimiError";
  }
}

const DEFAULT_SYSTEM_PROMPT = "You are a senior software engineer. Be concise and practical.";
const DEFAULT_MAX_TOKENS = 5000;
const DEFAULT_MODEL = "kimi-k2.5";

function buildMessages(req: KimiRequest): ChatMessage[] {
  // If messages array provided, use it (prepend system if not present)
  if (req.messages && req.messages.length > 0) {
    const hasSystem = req.messages[0]?.role === "system";
    if (hasSystem) {
      return req.messages;
    }
    return [
      { role: "system", content: req.systemPrompt ?? DEFAULT_SYSTEM_PROMPT },
      ...req.messages,
    ];
  }

  // Single prompt mode (backward compatible)
  return [
    { role: "system", content: req.systemPrompt ?? DEFAULT_SYSTEM_PROMPT },
    { role: "user", content: String(req.prompt ?? "") },
  ];
}

export async function callKimi(req: KimiRequest): Promise<KimiResponse> {
  const apiKey = process.env.MOONSHOT_API_KEY;
  const base = process.env.MOONSHOT_BASE || "https://api.moonshot.ai/v1";

  if (!apiKey) {
    throw new KimiError("Missing MOONSHOT_API_KEY");
  }

  const messages = buildMessages(req);
  const model = req.model || DEFAULT_MODEL;

  const resp = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: req.maxTokens ?? DEFAULT_MAX_TOKENS,
      temperature: 1, // Required by Kimi - must be exactly 1
    }),
  });

  const data = await resp.json();

  if (!resp.ok) {
    throw new KimiError(
      data?.error?.message ?? `Kimi API error: ${resp.status}`,
      resp.status,
      data
    );
  }

  const choice = data.choices?.[0];
  const message = choice?.message;
  const usage = data.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

  // Get last user message for tracking
  const lastUserMsg = messages.filter(m => m.role === "user").pop();
  if (req.trackTokens !== false) {
    trackUsage(usage, lastUserMsg?.content ?? "", req.systemPrompt);
  }

  return {
    content: message?.content ?? "",
    reasoningContent: message?.reasoning_content,
    usage,
    raw: data,
  };
}

export interface KimiStreamCallbacks {
  onContent?: (delta: string) => void;
  onReasoning?: (delta: string) => void;
  onUsage?: (usage: KimiUsage) => void;
  onDone?: () => void;
  onError?: (error: Error) => void;
}

export async function streamKimi(req: KimiRequest): Promise<Response> {
  const apiKey = process.env.MOONSHOT_API_KEY;
  const base = process.env.MOONSHOT_BASE || "https://api.moonshot.ai/v1";

  if (!apiKey) {
    throw new KimiError("Missing MOONSHOT_API_KEY");
  }

  const messages = buildMessages(req);
  const model = req.model || DEFAULT_MODEL;

  const resp = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: req.maxTokens ?? DEFAULT_MAX_TOKENS,
      temperature: 1,
      stream: true,
    }),
  });

  if (!resp.ok) {
    const data = await resp.json();
    throw new KimiError(
      data?.error?.message ?? `Kimi API error: ${resp.status}`,
      resp.status,
      data
    );
  }

  return resp;
}
