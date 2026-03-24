import Head from "next/head";
import { useState, useRef, useEffect, useCallback } from "react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import * as piperTts from "@/lib/piper-tts";

const AGE_STORAGE_KEY = "doubt-solver-age";
const AGE_OPTIONS = [
  { value: 7, label: "6–8 years" },
  { value: 10, label: "9–11 years" },
  { value: 13, label: "12–15 years" },
];

function SpeakerIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    </svg>
  );
}

function StopIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M6 6h12v12H6z" />
    </svg>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  );
}

export default function Home() {
  const [question, setQuestion] = useState("");
  const [age, setAge] = useState(10);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastSpokenAnswerRef = useRef("");
  const ageRef = useRef(age);
  const abortControllerRef = useRef<AbortController | null>(null);
  ageRef.current = age;

  const submitWithQuestion = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    abortControllerRef.current?.abort();
    piperTts.stop();
    setQuestion(trimmed);
    setAnswer("");
    setError(null);
    setLoading(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed, age: ageRef.current }),
        signal: controller.signal,
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
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      if (abortControllerRef.current === controller) abortControllerRef.current = null;
      setLoading(false);
    }
  }, []);

  const handleSpeechResult = useCallback(
    (transcript: string) => {
      setQuestion(transcript);
      submitWithQuestion(transcript);
    },
    [submitWithQuestion]
  );

  const { start: startListening, stop: stopListening, listening, supported: sttSupported, error: sttError } =
    useSpeechRecognition(handleSpeechResult);

  const speakAnswer = useCallback(async () => {
    if (!answer.trim() || ttsLoading || speaking) return;
    setTtsLoading(true);
    setError(null);
    try {
      await piperTts.speak(
        answer,
        (pct) => {
          if (pct < 100) setTtsLoading(true);
        },
        () => setSpeaking(false)
      );
      setSpeaking(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not play voice");
    } finally {
      setTtsLoading(false);
    }
  }, [answer, ttsLoading, speaking]);

  const stopSpeaking = useCallback(() => {
    piperTts.stop();
    setSpeaking(false);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [answer]);

  useEffect(() => {
    piperTts.preload().catch(() => {});
  }, []);

  useEffect(() => {
    const stored = sessionStorage.getItem(AGE_STORAGE_KEY);
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (AGE_OPTIONS.some((o) => o.value === parsed)) setAge(parsed);
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem(AGE_STORAGE_KEY, String(age));
  }, [age]);

  useEffect(() => {
    if (!loading && answer.trim() && answer !== lastSpokenAnswerRef.current) {
      lastSpokenAnswerRef.current = answer;
      speakAnswer();
    }
    if (!answer.trim()) lastSpokenAnswerRef.current = "";
  }, [loading, answer, speakAnswer]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitWithQuestion(question);
  }

  return (
    <>
      <Head>
        <title>DoubtSolver - Simple Explanations for Kids</title>
        <meta name="description" content="Ask any question and get easy-to-understand answers. Made for children aged 6-15." />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </Head>
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md rounded-3xl bg-[#F3F4FF] p-8 shadow-sm flex flex-col items-center">
        {/* Header */}
        <div className="text-center mb-8 w-full">
          <h1 className="text-4xl font-bold text-indigo-700">DoubtSolver</h1>
          <p className="text-gray-600 mt-2 text-lg">
            Ask anything. I&apos;ll explain it simply.
          </p>
        </div>

        {/* Age Selection */}
        <div className="mb-8 w-full max-w-md">
          <p className="text-gray-700 mb-3 font-medium">Select your age</p>
          <div className="grid grid-cols-3 gap-3">
            {AGE_OPTIONS.map((opt) => {
              const isSelected = age === opt.value;
              const shortLabel = opt.label.replace(/\s*years?$/i, "");
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAge(opt.value)}
                  aria-pressed={isSelected}
              className={`p-4 rounded-xl border text-sm font-medium transition ${
                isSelected
                  ? "bg-indigo-600 text-white shadow-lg scale-105"
                  : "bg-white hover:bg-indigo-50"
              }`}
                >
                  {shortLabel} yrs
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 w-full max-w-md min-h-0">
          {/* Chat Box - input inside white card per mockup */}
          <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-4 flex flex-col flex-1 min-h-[180px] mb-4 overflow-y-auto">
            {/* Chat Messages / Placeholder */}
            {answer ? (
              <div className="flex flex-col gap-3 flex-1 mb-4">
                <div className="flex items-start gap-3">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap flex-1">
                    {answer}
                  </p>
                  <button
                    type="button"
                    onClick={speaking ? stopSpeaking : speakAnswer}
                    disabled={loading}
                    aria-label={speaking ? "Stop" : "Listen"}
                    className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center bg-indigo-100 text-indigo-600 hover:bg-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {ttsLoading ? (
                      <span className="text-xs">...</span>
                    ) : speaking ? (
                      <StopIcon className="w-6 h-6" />
                    ) : (
                      <SpeakerIcon className="w-6 h-6" />
                    )}
                  </button>
                </div>
                {(speaking || ttsLoading) && (
                  <p className="text-indigo-600 text-sm font-medium">
                    {ttsLoading ? "Preparing voice..." : "Speaking..."}
                  </p>
                )}
              </div>
            ) : loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-8 flex-1 mb-4">
                <p className="text-gray-600 font-medium">Thinking...</p>
                <span className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-bounce" />
                </span>
              </div>
            ) : (
              <div className="flex-1 mb-4 text-gray-500 text-sm min-h-[60px]">
                Start asking your doubts 👇
              </div>
            )}
            <div ref={bottomRef} />

            {/* Input - inside white card per mockup */}
            <div className="flex gap-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Type your question..."
                aria-label="Your question"
                className="flex-1 border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!question.trim()}
                className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Ask
              </button>
            </div>
          </div>

          {(error || sttError) && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3">
              <p className="text-red-700 text-sm">{error || sttError}</p>
            </div>
          )}

          <div className="mb-6" />
        </form>

        {/* Mic Button */}
        {sttSupported && (
          <button
            type="button"
            onMouseDown={() => startListening()}
            onMouseUp={() => stopListening()}
            onMouseLeave={() => stopListening()}
            onTouchStart={(e) => { e.preventDefault(); startListening(); }}
            onTouchEnd={(e) => { e.preventDefault(); stopListening(); }}
            onTouchCancel={() => stopListening()}
            disabled={loading}
            aria-label="Hold to talk"
            title="Hold to talk"
            className={`mt-6 p-4 rounded-full shadow-lg transition-all select-none touch-manipulation ${
              listening
                ? "bg-red-500 text-white animate-pulse"
                : "bg-pink-500 text-white hover:bg-pink-600"
            }`}
          >
            🎤
          </button>
        )}
        </div>
      </div>
    </>
  );
}
