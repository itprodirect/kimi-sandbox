"use client";

import { useState, useRef, useEffect } from "react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [maxTokens, setMaxTokens] = useState(5000);
  const [streaming, setStreaming] = useState(true);
  const [loading, setLoading] = useState(false);
  const [expandedReasoning, setExpandedReasoning] = useState<number | null>(null);

  // Streaming state
  const [streamContent, setStreamContent] = useState("");
  const [streamReasoning, setStreamReasoning] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamContent]);

  // Build messages array for API
  function buildApiMessages(): { role: string; content: string }[] {
    return messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
  }

  async function sendMessage() {
    const userMessage = input.trim();
    if (!userMessage || loading) return;

    // Add user message
    const newMessages: ChatMessage[] = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setStreamContent("");
    setStreamReasoning("");

    const apiMessages = [
      ...newMessages.map((m) => ({ role: m.role, content: m.content })),
    ];

    if (streaming) {
      await sendStreaming(apiMessages, newMessages);
    } else {
      await sendNonStreaming(apiMessages, newMessages);
    }

    setLoading(false);
  }

  async function sendStreaming(
    apiMessages: { role: string; content: string }[],
    currentMessages: ChatMessage[]
  ) {
    abortControllerRef.current = new AbortController();

    try {
      const r = await fetch("/api/kimi/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, maxTokens }),
        signal: abortControllerRef.current.signal,
      });

      if (!r.ok) {
        const error = await r.json();
        setMessages([
          ...currentMessages,
          { role: "assistant", content: `Error: ${error.error || "Request failed"}` },
        ]);
        return;
      }

      const reader = r.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let content = "";
      let reasoning = "";
      let usage = null;
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === "data: [DONE]") continue;

          if (trimmed.startsWith("data: ")) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              if (data.content) {
                content += data.content;
                setStreamContent(content);
              }
              if (data.reasoning) {
                reasoning += data.reasoning;
                setStreamReasoning(reasoning);
              }
              if (data.usage) {
                usage = data.usage;
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }

      // Add assistant message
      setMessages([
        ...currentMessages,
        {
          role: "assistant",
          content,
          reasoning: reasoning || undefined,
          usage: usage || undefined,
        },
      ]);
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        setMessages([
          ...currentMessages,
          { role: "assistant", content: "(cancelled)" },
        ]);
      }
    }
  }

  async function sendNonStreaming(
    apiMessages: { role: string; content: string }[],
    currentMessages: ChatMessage[]
  ) {
    try {
      const r = await fetch("/api/kimi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, maxTokens }),
      });
      const data = await r.json();

      setMessages([
        ...currentMessages,
        {
          role: "assistant",
          content: data.ok ? data.content : `Error: ${data.error}`,
          reasoning: data.reasoningContent,
          usage: data.usage,
        },
      ]);
    } catch (e) {
      setMessages([
        ...currentMessages,
        { role: "assistant", content: `Error: ${e instanceof Error ? e.message : "Unknown"}` },
      ]);
    }
  }

  function stop() {
    abortControllerRef.current?.abort();
    setLoading(false);
  }

  function clearChat() {
    setMessages([]);
    setStreamContent("");
    setStreamReasoning("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // Calculate total tokens used in conversation
  const totalTokens = messages.reduce((sum, m) => sum + (m.usage?.total_tokens || 0), 0);

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-800 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/" className="text-gray-400 hover:text-gray-200">
              ← Templates
            </a>
            <a href="/compare" className="text-green-400 hover:text-green-300 text-sm">
              A/B Compare
            </a>
            <h1 className="text-xl font-bold">Kimi Chat</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-400">
              {messages.length} messages • {totalTokens.toLocaleString()} tokens
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-400">Max:</label>
              <input
                type="number"
                value={maxTokens}
                onChange={(e) => setMaxTokens(Number(e.target.value))}
                min={100}
                max={16000}
                step={500}
                className="w-20 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-400">
              <input
                type="checkbox"
                checked={streaming}
                onChange={(e) => setStreaming(e.target.checked)}
                className="w-4 h-4"
              />
              Stream
            </label>
            <button
              onClick={clearChat}
              className="text-sm text-gray-400 hover:text-red-400"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 && !loading && (
            <div className="text-center text-gray-500 py-20">
              Start a conversation with Kimi 2.5
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-4 ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-100"
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Reasoning toggle */}
                {msg.reasoning && (
                  <div className="mt-2 pt-2 border-t border-gray-700">
                    <button
                      onClick={() =>
                        setExpandedReasoning(expandedReasoning === i ? null : i)
                      }
                      className="text-xs text-yellow-400 hover:text-yellow-300"
                    >
                      {expandedReasoning === i ? "▼ Hide" : "▶ Show"} reasoning
                    </button>
                    {expandedReasoning === i && (
                      <div className="mt-2 text-sm text-yellow-200 whitespace-pre-wrap">
                        {msg.reasoning}
                      </div>
                    )}
                  </div>
                )}

                {/* Usage */}
                {msg.usage && msg.role === "assistant" && (
                  <div className="mt-2 text-xs text-gray-500">
                    {msg.usage.total_tokens.toLocaleString()} tokens
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Streaming message */}
          {loading && streaming && (streamContent || streamReasoning) && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg p-4 bg-gray-800 text-gray-100">
                {streamReasoning && (
                  <div className="text-sm text-yellow-200 whitespace-pre-wrap mb-2 pb-2 border-b border-gray-700">
                    {streamReasoning}
                    <span className="inline-block w-2 h-4 bg-yellow-400 animate-pulse ml-1" />
                  </div>
                )}
                <div className="whitespace-pre-wrap">
                  {streamContent}
                  {!streamReasoning && (
                    <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1" />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Loading indicator */}
          {loading && !streamContent && !streamReasoning && (
            <div className="flex justify-start">
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-400">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                  Thinking...
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-gray-800 p-4">
        <div className="max-w-4xl mx-auto flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send, Shift+Enter for newline)"
            rows={2}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 resize-none focus:outline-none focus:border-blue-500"
          />
          {loading ? (
            <button
              onClick={stop}
              className="bg-red-600 hover:bg-red-700 px-6 rounded-lg font-medium transition-colors"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed px-6 rounded-lg font-medium transition-colors"
            >
              Send
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
