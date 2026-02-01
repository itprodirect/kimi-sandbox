"use client";

import { useState, useEffect, useRef } from "react";

interface KimiResponse {
  ok: boolean;
  content?: string;
  reasoningContent?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  error?: string;
}

interface TemplateInfo {
  name: string;
  content: string;
  variables: string[];
}

export default function Home() {
  const [templates, setTemplates] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [templateInfo, setTemplateInfo] = useState<TemplateInfo | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [customPrompt, setCustomPrompt] = useState("");
  const [maxTokens, setMaxTokens] = useState(5000);
  const [streaming, setStreaming] = useState(true);
  const [response, setResponse] = useState<KimiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"content" | "reasoning" | "raw">("content");

  // Streaming state
  const [streamContent, setStreamContent] = useState("");
  const [streamReasoning, setStreamReasoning] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load template list on mount
  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setTemplates(d.templates);
      });
  }, []);

  // Load template details when selection changes
  useEffect(() => {
    if (!selectedTemplate) {
      setTemplateInfo(null);
      setVariables({});
      return;
    }
    fetch(`/api/templates?name=${selectedTemplate}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setTemplateInfo(d);
          const vars: Record<string, string> = {};
          d.variables.forEach((v: string) => (vars[v] = ""));
          setVariables(vars);
        }
      });
  }, [selectedTemplate]);

  // Build final prompt from template + variables
  function buildPrompt(): string {
    if (!selectedTemplate || !templateInfo) {
      return customPrompt;
    }
    let prompt = templateInfo.content;
    for (const [key, value] of Object.entries(variables)) {
      prompt = prompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
    }
    return prompt;
  }

  async function runStream(prompt: string) {
    setStreamContent("");
    setStreamReasoning("");
    setActiveTab("reasoning"); // Start with reasoning tab for streaming

    abortControllerRef.current = new AbortController();

    try {
      const r = await fetch("/api/kimi/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, maxTokens, template: selectedTemplate || undefined }),
        signal: abortControllerRef.current.signal,
      });

      if (!r.ok) {
        const error = await r.json();
        setResponse({ ok: false, error: error.error || "Stream request failed" });
        return;
      }

      const reader = r.body?.getReader();
      if (!reader) {
        setResponse({ ok: false, error: "No response body" });
        return;
      }

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

      // Set final response
      setResponse({
        ok: true,
        content,
        reasoningContent: reasoning || undefined,
        usage: usage || undefined,
      });

      // Switch to content tab if no reasoning
      if (!reasoning && content) {
        setActiveTab("content");
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        setResponse({ ok: false, error: "Request cancelled" });
      } else {
        setResponse({ ok: false, error: e instanceof Error ? e.message : "Stream failed" });
      }
    }
  }

  async function runNonStream(prompt: string) {
    try {
      const r = await fetch("/api/kimi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, maxTokens, template: selectedTemplate || undefined }),
      });
      const data = await r.json();
      setResponse(data);
      setActiveTab(data.reasoningContent ? "reasoning" : "content");
    } catch (e) {
      setResponse({ ok: false, error: e instanceof Error ? e.message : "Request failed" });
    }
  }

  async function run() {
    const prompt = buildPrompt();
    if (!prompt.trim()) return;

    setLoading(true);
    setResponse(null);

    if (streaming) {
      await runStream(prompt);
    } else {
      await runNonStream(prompt);
    }

    setLoading(false);
  }

  function stop() {
    abortControllerRef.current?.abort();
    setLoading(false);
  }

  // Display content (streaming or final)
  const displayContent = loading && streaming ? streamContent : response?.content;
  const displayReasoning = loading && streaming ? streamReasoning : response?.reasoningContent;

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Kimi Sandbox</h1>

        {/* Controls Row */}
        <div className="flex gap-4 mb-4 flex-wrap items-end">
          <div className="flex-1 min-w-48">
            <label className="block text-sm text-gray-400 mb-1">Template</label>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-gray-100"
            >
              <option value="">Custom (no template)</option>
              {templates.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="w-32">
            <label className="block text-sm text-gray-400 mb-1">Max Tokens</label>
            <input
              type="number"
              value={maxTokens}
              onChange={(e) => setMaxTokens(Number(e.target.value))}
              min={100}
              max={16000}
              step={500}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-gray-100"
            />
          </div>

          <div className="flex items-center gap-2 pb-1">
            <input
              type="checkbox"
              id="streaming"
              checked={streaming}
              onChange={(e) => setStreaming(e.target.checked)}
              className="w-4 h-4 rounded bg-gray-800 border-gray-700"
            />
            <label htmlFor="streaming" className="text-sm text-gray-400">
              Stream
            </label>
          </div>
        </div>

        {/* Template Variables */}
        {templateInfo && templateInfo.variables.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-4">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Template Variables</h3>
            <div className="grid gap-4">
              {templateInfo.variables.map((varName) => (
                <div key={varName}>
                  <label className="block text-sm text-gray-300 mb-1">{varName}</label>
                  {varName === "CODE" || varName === "DIFF" || varName === "CONSTRAINTS" ? (
                    <textarea
                      value={variables[varName] || ""}
                      onChange={(e) => setVariables({ ...variables, [varName]: e.target.value })}
                      rows={6}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-gray-100 font-mono text-sm"
                      placeholder={`Enter ${varName.toLowerCase()}...`}
                    />
                  ) : (
                    <input
                      type="text"
                      value={variables[varName] || ""}
                      onChange={(e) => setVariables({ ...variables, [varName]: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-gray-100"
                      placeholder={`Enter ${varName.toLowerCase()}...`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Custom Prompt (when no template selected) */}
        {!selectedTemplate && (
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-1">Prompt</label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows={8}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-gray-100"
              placeholder="Enter your prompt..."
            />
          </div>
        )}

        {/* Run/Stop Buttons */}
        <div className="flex gap-2">
          <button
            onClick={run}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed px-6 py-2 rounded font-medium transition-colors"
          >
            {loading ? "Running..." : "Run"}
          </button>
          {loading && streaming && (
            <button
              onClick={stop}
              className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded font-medium transition-colors"
            >
              Stop
            </button>
          )}
        </div>

        {/* Response */}
        {(response || (loading && streaming && (streamContent || streamReasoning))) && (
          <div className="mt-6">
            {/* Token Usage */}
            {response?.usage && (
              <div className="flex gap-4 text-sm text-gray-400 mb-4">
                <span>Prompt: {response.usage.prompt_tokens.toLocaleString()} tokens</span>
                <span>Completion: {response.usage.completion_tokens.toLocaleString()} tokens</span>
                <span className="text-gray-300 font-medium">
                  Total: {response.usage.total_tokens.toLocaleString()} tokens
                </span>
              </div>
            )}

            {/* Streaming indicator */}
            {loading && streaming && (
              <div className="flex items-center gap-2 text-sm text-blue-400 mb-4">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                Streaming...
              </div>
            )}

            {/* Error Display */}
            {response && !response.ok && (
              <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 text-red-200">
                {response.error}
              </div>
            )}

            {/* Success Display */}
            {(response?.ok || (loading && streaming)) && (
              <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
                {/* Tabs */}
                <div className="flex border-b border-gray-800">
                  <button
                    onClick={() => setActiveTab("content")}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      activeTab === "content"
                        ? "bg-gray-800 text-white"
                        : "text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    Content
                  </button>
                  {(displayReasoning || loading) && (
                    <button
                      onClick={() => setActiveTab("reasoning")}
                      className={`px-4 py-2 text-sm font-medium transition-colors ${
                        activeTab === "reasoning"
                          ? "bg-gray-800 text-white"
                          : "text-gray-400 hover:text-gray-200"
                      }`}
                    >
                      Reasoning
                    </button>
                  )}
                  <button
                    onClick={() => setActiveTab("raw")}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      activeTab === "raw"
                        ? "bg-gray-800 text-white"
                        : "text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    Raw
                  </button>
                </div>

                {/* Tab Content */}
                <div className="p-4 max-h-[600px] overflow-auto">
                  {activeTab === "content" && (
                    <div className="whitespace-pre-wrap font-mono text-sm text-gray-200">
                      {displayContent || (loading ? "" : "(empty)")}
                      {loading && streaming && activeTab === "content" && (
                        <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1" />
                      )}
                    </div>
                  )}
                  {activeTab === "reasoning" && (
                    <div className="whitespace-pre-wrap font-mono text-sm text-yellow-200">
                      {displayReasoning || (loading ? "" : "(no reasoning content)")}
                      {loading && streaming && activeTab === "reasoning" && (
                        <span className="inline-block w-2 h-4 bg-yellow-400 animate-pulse ml-1" />
                      )}
                    </div>
                  )}
                  {activeTab === "raw" && (
                    <pre className="text-xs text-gray-400 overflow-auto">
                      {response ? JSON.stringify(response, null, 2) : "{}"}
                    </pre>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
