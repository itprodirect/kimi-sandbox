"use client";

import { useState, useRef } from "react";

interface ModelResult {
  content: string;
  reasoning?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  durationMs?: number;
  error?: string;
  loading: boolean;
}

const MODELS = {
  // Kimi models
  "kimi-k2": {
    name: "Kimi K2",
    endpoint: "/api/kimi/stream",
    hasReasoning: true,
    modelParam: "kimi-k2",
    provider: "kimi",
  },
  "kimi-k2.5": {
    name: "Kimi K2.5",
    endpoint: "/api/kimi/stream",
    hasReasoning: true,
    modelParam: "kimi-k2.5",
    provider: "kimi",
  },
  // OpenAI models - GPT-4.1 series (coding optimized)
  "gpt-4.1": {
    name: "GPT-4.1",
    endpoint: "/api/openai/stream",
    hasReasoning: false,
    modelParam: "gpt-4.1",
    provider: "openai",
  },
  "gpt-4.1-mini": {
    name: "GPT-4.1 Mini",
    endpoint: "/api/openai/stream",
    hasReasoning: false,
    modelParam: "gpt-4.1-mini",
    provider: "openai",
  },
  "gpt-4.1-nano": {
    name: "GPT-4.1 Nano",
    endpoint: "/api/openai/stream",
    hasReasoning: false,
    modelParam: "gpt-4.1-nano",
    provider: "openai",
  },
  // OpenAI models - O-series (reasoning)
  "o3": {
    name: "o3",
    endpoint: "/api/openai/stream",
    hasReasoning: true,
    modelParam: "o3",
    provider: "openai",
  },
  "o4-mini": {
    name: "o4 Mini",
    endpoint: "/api/openai/stream",
    hasReasoning: true,
    modelParam: "o4-mini",
    provider: "openai",
  },
};

type ModelKey = keyof typeof MODELS;

export default function ComparePage() {
  const [prompt, setPrompt] = useState("");
  const [maxTokens, setMaxTokens] = useState(5000);
  const [selectedModels, setSelectedModels] = useState<ModelKey[]>(["kimi-k2.5", "gpt-4.1"]);
  const [results, setResults] = useState<Record<ModelKey, ModelResult>>(
    Object.fromEntries(
      Object.keys(MODELS).map((key) => [key, { content: "", loading: false }])
    ) as Record<ModelKey, ModelResult>
  );
  const [expandedReasoning, setExpandedReasoning] = useState<ModelKey | null>(null);
  const abortControllersRef = useRef<Record<string, AbortController>>({});

  function toggleModel(model: ModelKey) {
    setSelectedModels((prev) =>
      prev.includes(model) ? prev.filter((m) => m !== model) : [...prev, model]
    );
  }

  async function runComparison() {
    if (!prompt.trim() || selectedModels.length === 0) return;

    // Reset results for selected models
    const newResults = { ...results };
    for (const model of selectedModels) {
      newResults[model] = { content: "", loading: true };
    }
    setResults(newResults);

    // Run all models in parallel
    await Promise.all(selectedModels.map((model) => runModel(model)));
  }

  async function runModel(modelKey: ModelKey) {
    const model = MODELS[modelKey];
    const startTime = Date.now();

    abortControllersRef.current[modelKey] = new AbortController();

    try {
      const body: Record<string, unknown> = { prompt, maxTokens };
      if ("modelParam" in model) {
        body.model = model.modelParam;
      }

      const r = await fetch(model.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: abortControllersRef.current[modelKey].signal,
      });

      if (!r.ok) {
        const error = await r.json();
        setResults((prev) => ({
          ...prev,
          [modelKey]: {
            content: "",
            error: error.error || "Request failed",
            loading: false,
            durationMs: Date.now() - startTime,
          },
        }));
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
                setResults((prev) => ({
                  ...prev,
                  [modelKey]: { ...prev[modelKey], content, loading: true },
                }));
              }
              if (data.reasoning) {
                reasoning += data.reasoning;
                setResults((prev) => ({
                  ...prev,
                  [modelKey]: { ...prev[modelKey], reasoning, loading: true },
                }));
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

      setResults((prev) => ({
        ...prev,
        [modelKey]: {
          content,
          reasoning: reasoning || undefined,
          usage: usage || undefined,
          loading: false,
          durationMs: Date.now() - startTime,
        },
      }));
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        setResults((prev) => ({
          ...prev,
          [modelKey]: {
            content: "(cancelled)",
            loading: false,
            durationMs: Date.now() - startTime,
          },
        }));
      } else {
        setResults((prev) => ({
          ...prev,
          [modelKey]: {
            content: "",
            error: e instanceof Error ? e.message : "Unknown error",
            loading: false,
            durationMs: Date.now() - startTime,
          },
        }));
      }
    }
  }

  function stopAll() {
    Object.values(abortControllersRef.current).forEach((c) => c.abort());
    setResults((prev) => {
      const updated = { ...prev };
      for (const key of Object.keys(updated) as ModelKey[]) {
        if (updated[key].loading) {
          updated[key] = { ...updated[key], loading: false };
        }
      }
      return updated;
    });
  }

  const isLoading = selectedModels.some((m) => results[m].loading);
  const hasResults = selectedModels.some((m) => results[m].content || results[m].error);

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <a href="/" className="text-gray-400 hover:text-gray-200">
              ← Templates
            </a>
            <h1 className="text-3xl font-bold">A/B Compare</h1>
          </div>
          <a href="/chat" className="text-blue-400 hover:text-blue-300 text-sm">
            Multi-turn Chat →
          </a>
        </div>

        {/* Controls */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-6">
          <div className="flex gap-4 mb-4 flex-wrap items-end">
            {/* Model Selection */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Models</label>
              <div className="space-y-2">
                {/* Kimi Models */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-16">Kimi:</span>
                  <div className="flex gap-2 flex-wrap">
                    {(Object.keys(MODELS) as ModelKey[])
                      .filter((key) => MODELS[key].provider === "kimi")
                      .map((key) => (
                        <button
                          key={key}
                          onClick={() => toggleModel(key)}
                          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                            selectedModels.includes(key)
                              ? "bg-purple-600 text-white"
                              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                          }`}
                        >
                          {MODELS[key].name}
                        </button>
                      ))}
                  </div>
                </div>
                {/* OpenAI Models */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-16">OpenAI:</span>
                  <div className="flex gap-2 flex-wrap">
                    {(Object.keys(MODELS) as ModelKey[])
                      .filter((key) => MODELS[key].provider === "openai")
                      .map((key) => (
                        <button
                          key={key}
                          onClick={() => toggleModel(key)}
                          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                            selectedModels.includes(key)
                              ? "bg-green-600 text-white"
                              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                          }`}
                        >
                          {MODELS[key].name}
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Max Tokens */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Max Tokens</label>
              <input
                type="number"
                value={maxTokens}
                onChange={(e) => setMaxTokens(Number(e.target.value))}
                min={100}
                max={16000}
                step={500}
                className="w-28 bg-gray-800 border border-gray-700 rounded px-3 py-1 text-gray-100"
              />
            </div>
          </div>

          {/* Prompt Input */}
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-2">Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-gray-100"
              placeholder="Enter a prompt to compare across models..."
            />
          </div>

          {/* Run Button */}
          <div className="flex gap-2">
            <button
              onClick={runComparison}
              disabled={isLoading || !prompt.trim() || selectedModels.length === 0}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed px-6 py-2 rounded font-medium transition-colors"
            >
              {isLoading ? "Running..." : "Compare"}
            </button>
            {isLoading && (
              <button
                onClick={stopAll}
                className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded font-medium transition-colors"
              >
                Stop All
              </button>
            )}
          </div>
        </div>

        {/* Results Grid */}
        {hasResults && (
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${selectedModels.length}, minmax(0, 1fr))`,
            }}
          >
            {selectedModels.map((modelKey) => {
              const model = MODELS[modelKey];
              const result = results[modelKey];

              return (
                <div
                  key={modelKey}
                  className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden"
                >
                  {/* Model Header */}
                  <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
                    <span className="font-medium">{model.name}</span>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      {result.durationMs && (
                        <span>{(result.durationMs / 1000).toFixed(1)}s</span>
                      )}
                      {result.usage && (
                        <span>{result.usage.total_tokens.toLocaleString()} tok</span>
                      )}
                      {result.loading && (
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 max-h-[500px] overflow-auto">
                    {result.error && (
                      <div className="text-red-400 text-sm">{result.error}</div>
                    )}

                    {/* Reasoning (Kimi) */}
                    {result.reasoning && (
                      <div className="mb-3">
                        <button
                          onClick={() =>
                            setExpandedReasoning(
                              expandedReasoning === modelKey ? null : modelKey
                            )
                          }
                          className="text-xs text-yellow-400 hover:text-yellow-300 mb-1"
                        >
                          {expandedReasoning === modelKey ? "▼ Hide" : "▶ Show"}{" "}
                          reasoning
                        </button>
                        {expandedReasoning === modelKey && (
                          <div className="text-sm text-yellow-200 whitespace-pre-wrap bg-gray-800 rounded p-2 mt-1">
                            {result.reasoning}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Main Content */}
                    <div className="whitespace-pre-wrap text-sm text-gray-200">
                      {result.content || (result.loading ? "" : "(no content)")}
                      {result.loading && (
                        <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
