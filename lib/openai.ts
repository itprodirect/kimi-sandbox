export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenAIRequest {
  prompt?: string;
  messages?: ChatMessage[];
  systemPrompt?: string;
  maxTokens?: number;
  model?: string;
}

export interface OpenAIUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface OpenAIResponse {
  content: string;
  usage: OpenAIUsage;
  model: string;
  raw: unknown;
}

export class OpenAIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public raw?: unknown
  ) {
    super(message);
    this.name = "OpenAIError";
  }
}

const DEFAULT_SYSTEM_PROMPT = "You are a senior software engineer. Be concise and practical.";
const DEFAULT_MAX_TOKENS = 5000;
const DEFAULT_MODEL = "gpt-4.1";

function buildMessages(req: OpenAIRequest): ChatMessage[] {
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
  return [
    { role: "system", content: req.systemPrompt ?? DEFAULT_SYSTEM_PROMPT },
    { role: "user", content: String(req.prompt ?? "") },
  ];
}

export async function callOpenAI(req: OpenAIRequest): Promise<OpenAIResponse> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new OpenAIError("Missing OPENAI_API_KEY");
  }

  const messages = buildMessages(req);
  const model = req.model || DEFAULT_MODEL;

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: req.maxTokens ?? DEFAULT_MAX_TOKENS,
    }),
  });

  const data = await resp.json();

  if (!resp.ok) {
    throw new OpenAIError(
      data?.error?.message ?? `OpenAI API error: ${resp.status}`,
      resp.status,
      data
    );
  }

  const content = data.choices?.[0]?.message?.content ?? "";
  const usage: OpenAIUsage = data.usage ?? {
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
  };

  return {
    content,
    usage,
    model: data.model,
    raw: data,
  };
}

export async function streamOpenAI(req: OpenAIRequest): Promise<Response> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new OpenAIError("Missing OPENAI_API_KEY");
  }

  const messages = buildMessages(req);
  const model = req.model || DEFAULT_MODEL;

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: req.maxTokens ?? DEFAULT_MAX_TOKENS,
      stream: true,
      stream_options: { include_usage: true },
    }),
  });

  if (!resp.ok) {
    const data = await resp.json();
    throw new OpenAIError(
      data?.error?.message ?? `OpenAI API error: ${resp.status}`,
      resp.status,
      data
    );
  }

  return resp;
}

export const OPENAI_MODELS = [
  { id: "gpt-4.1", name: "GPT-4.1", tier: "coding" },
  { id: "gpt-4.1-mini", name: "GPT-4.1 Mini", tier: "coding-fast" },
  { id: "gpt-4.1-nano", name: "GPT-4.1 Nano", tier: "coding-ultrafast" },
  { id: "o3", name: "o3", tier: "reasoning" },
  { id: "o4-mini", name: "o4 Mini", tier: "reasoning-fast" },
] as const;
