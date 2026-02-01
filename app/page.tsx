"use client";

import { useState } from "react";

export default function Home() {
  const [prompt, setPrompt] = useState("Give me a 5-step plan to refactor a Next.js app safely.");
  const [out, setOut] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    setOut(null);
    const r = await fetch("/api/kimi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const j = await r.json();
    setOut(j);
    setLoading(false);
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Kimi Sandbox</h1>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={8}
        style={{ width: "100%", marginTop: 12, padding: 12 }}
      />
      <button onClick={run} disabled={loading} style={{ marginTop: 12, padding: "10px 14px" }}>
        {loading ? "Running..." : "Run"}
      </button>

      <pre style={{ marginTop: 16, whiteSpace: "pre-wrap" }}>
        {out ? JSON.stringify(out, null, 2) : ""}
      </pre>
    </main>
  );
}
