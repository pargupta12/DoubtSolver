"use client";

import { useState, useRef, useEffect } from "react";

const AGE_OPTIONS = [
  { value: 7, label: "6–8 years" },
  { value: 10, label: "9–11 years" },
  { value: 13, label: "12–15 years" },
];

export default function ChatInterface() {
  const [question, setQuestion] = useState("");
  const [age, setAge] = useState(10);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [answer]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || loading) return;

    setAnswer("");
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim(), age }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Error ${res.status}`);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No response body");

      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setAnswer(text);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto">
      <div className="mb-4">
        <label className="block text-sm font-medium text-amber-900/80 mb-2">
          I am
        </label>
        <select
          value={age}
          onChange={(e) => setAge(Number(e.target.value))}
          className="w-full rounded-xl border-2 border-amber-200 bg-white px-4 py-2.5 text-amber-900 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
        >
          {AGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto rounded-2xl border-2 border-amber-100 bg-amber-50/50 p-4 min-h-[120px]">
          {answer ? (
            <p className="text-amber-900 leading-relaxed whitespace-pre-wrap">
              {answer}
            </p>
          ) : loading ? (
            <p className="text-amber-700/70">Thinking...</p>
          ) : (
            <p className="text-amber-600/60">
              Ask any question! I&apos;ll explain it in a simple way.
            </p>
          )}
          <div ref={bottomRef} />
        </div>

        {error && (
          <p className="text-red-600 text-sm px-2">{error}</p>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What do you want to know?"
            disabled={loading}
            className="flex-1 rounded-xl border-2 border-amber-200 bg-white px-4 py-3 text-amber-900 placeholder:text-amber-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="rounded-xl bg-amber-500 px-6 py-3 font-medium text-white hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "..." : "Ask"}
          </button>
        </div>
      </form>
    </div>
  );
}
