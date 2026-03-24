import Head from "next/head";
import { useState, useRef, useEffect, useCallback } from "react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import type { SpeechRecognitionLang } from "@/hooks/useSpeechRecognition";
import * as piperTts from "@/lib/piper-tts";
import type { AppLanguage } from "@/lib/answer-language";
import { loadState, recordQuestion, recordQuickCheck, getWeeklySummary, BADGE_DEFS } from "@/lib/game-state";
import type { GameState } from "@/lib/game-state";
import { SUBJECT_META } from "@/lib/subject-meta";
import StarStreak from "@/components/StarStreak";
import BadgeToast from "@/components/BadgeToast";
import TopicMastery from "@/components/TopicMastery";
import WeeklySummary from "@/components/WeeklySummary";

const AGE_STORAGE_KEY = "doubt-solver-age";
const LANG_STORAGE_KEY = "doubt-solver-language";

const AGE_OPTIONS = [
  { value: 6,  label: "6–7 years" },
  { value: 8,  label: "8–9 years" },
  { value: 10, label: "10–11 years" },
  { value: 13, label: "12–15 years" },
];

const LANG_OPTIONS: { value: AppLanguage; label: string }[] = [
  { value: "en", label: "English" },
  { value: "hi", label: "हिंदी" },
];

interface AnswerSection {
  type: "what" | "how" | "cool" | "example" | "check" | "other";
  heading: string;
  content: string;
}

const SECTION_CONFIG: Record<
  AnswerSection["type"],
  { bg: string; border: string; headingColor: string; icon: string }
> = {
  what:    { bg: "bg-indigo-50",  border: "border-indigo-200", headingColor: "text-indigo-700",  icon: "💡" },
  how:     { bg: "bg-sky-50",     border: "border-sky-200",    headingColor: "text-sky-700",     icon: "⚙️" },
  cool:    { bg: "bg-pink-50",    border: "border-pink-200",   headingColor: "text-pink-700",    icon: "🤩" },
  example: { bg: "bg-amber-50",   border: "border-amber-200",  headingColor: "text-amber-700",   icon: "🌟" },
  check:   { bg: "bg-purple-50",  border: "border-purple-200", headingColor: "text-purple-700",  icon: "✏️" },
  other:   { bg: "bg-white",      border: "border-gray-100",   headingColor: "text-gray-600",    icon: ""   },
};

function parseAnswerSections(text: string, lang: AppLanguage): AnswerSection[] {
  const headingPatterns: Array<{ type: AnswerSection["type"]; pattern: RegExp }> =
    lang === "hi"
      ? [
          { type: "what",    pattern: /यह क्या है/i },
          { type: "how",     pattern: /यह कैसे काम करता है/i },
          { type: "cool",    pattern: /यह मज़ेदार क्यों है/i },
          { type: "example", pattern: /उदाहरण/i },
          { type: "check",   pattern: /जल्दी जाँच/i },
        ]
      : [
          { type: "what",    pattern: /what is it/i },
          { type: "how",     pattern: /how does it work/i },
          { type: "cool",    pattern: /why is it cool/i },
          { type: "example", pattern: /^example$/i },
          { type: "check",   pattern: /quick check/i },
        ];

  const parts = text.split(/(?=👉)/);
  const sections: AnswerSection[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const m = trimmed.match(/^👉\s*([^:\n]+):\s*([\s\S]*)/);
    if (!m) {
      if (sections.length === 0) sections.push({ type: "other", heading: "", content: trimmed });
      continue;
    }
    const rawHeading = m[1]!.trim();
    const content = m[2]!.trim();
    let type: AnswerSection["type"] = "other";
    for (const { type: t, pattern } of headingPatterns) {
      if (pattern.test(rawHeading)) { type = t; break; }
    }
    sections.push({ type, heading: rawHeading, content });
  }

  return sections;
}

function sttLangForAppLanguage(language: AppLanguage): SpeechRecognitionLang {
  return language === "en" ? "en-US" : "hi-IN";
}

export default function Home() {
  const [question, setQuestion]                   = useState("");
  const [age, setAge]                             = useState(10);
  const [language, setLanguage]                   = useState<AppLanguage>("en");
  const [answer, setAnswer]                       = useState("");
  const [subject, setSubject]                     = useState("");
  const [loading, setLoading]                     = useState(false);
  const [error, setError]                         = useState<string | null>(null);
  const [speaking, setSpeaking]                   = useState(false);
  const [ttsLoading, setTtsLoading]               = useState(false);
  const [quickCheckInput, setQuickCheckInput]     = useState("");
  const [quickCheckFeedback, setQuickCheckFeedback] = useState("");
  const [checkingAnswer, setCheckingAnswer]       = useState(false);
  const [quickCheckListening, setQuickCheckListening] = useState(false);
  const [difficultyScore, setDifficultyScore]     = useState(0);
  const [showAdaptSuggestion, setShowAdaptSuggestion] = useState<"simpler" | "harder" | null>(null);

  // ── Gamification ─────────────────────────────────────────────────────────
  // IMPORTANT: initialize with a static SSR-safe default (no localStorage read).
  // Reading localStorage on the server returns defaultState() but the client
  // might have real data → different HTML → React hydration mismatch.
  // We load the real state from localStorage in a useEffect after hydration.
  const SSR_SAFE_GAME_STATE: GameState = {
    stars: 0, streak: { count: 0, lastDate: "" }, badges: [],
    topics: {}, weeklyStats: { questions: 0, passed: 0, failed: 0, weekStart: "" },
    totalQuickChecks: 0, totalMathPassed: 0,
  };
  const [gameState, setGameState]               = useState<GameState>(SSR_SAFE_GAME_STATE);
  const [pendingBadge, setPendingBadge]         = useState<string | null>(null);
  const [showWeekly, setShowWeekly]             = useState(false);
  const badgeQueueRef                           = useRef<string[]>([]);
  const currentTopicRef                         = useRef<string>("");
  const currentSubjectRef                       = useRef<string>("");

  // ── Capacitor / Android WebView detection ────────────────────────────────
  // speechSynthesis.speak() requires a direct user gesture in Android WebView.
  // We detect the Capacitor shell and skip auto-speak, showing a pulsing
  // "Tap to listen" hint on the 🔊 button instead.
  const [isCapacitorApp, setIsCapacitorApp]     = useState(false);
  const [unreadAnswer, setUnreadAnswer]         = useState(false);
  // Load real localStorage state + detect Capacitor after hydration (client only)
  useEffect(() => {
    setGameState(loadState());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setIsCapacitorApp(!!(window as any).Capacitor);
  }, []);

  const bottomRef            = useRef<HTMLDivElement>(null);
  const lastSpokenAnswerRef  = useRef("");
  const ageRef               = useRef(age);
  const languageRef          = useRef(language);
  const abortControllerRef   = useRef<AbortController | null>(null);
  // Keep current question+answer available for follow-up without state timing issues
  const priorContextRef      = useRef<{ question: string; answer: string } | null>(null);
  const detectedSubjectRef   = useRef<string>("");

  ageRef.current = age;
  languageRef.current = language;

  // ── Core submit ─────────────────────────────────────────────────────────────
  const submitWithQuestion = useCallback(async (
    q: string,
    opts?: { priorQuestion?: string; priorAnswer?: string }
  ) => {
    const trimmed = q.trim();
    if (!trimmed) return;

    abortControllerRef.current?.abort();
    piperTts.stop();

    setQuestion(trimmed);
    setAnswer("");
    setSubject("");
    setError(null);
    setLoading(true);
    setQuickCheckInput("");
    setQuickCheckFeedback("");

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: trimmed,
          age: ageRef.current,
          language: languageRef.current,
          priorQuestion: opts?.priorQuestion,
          priorAnswer: opts?.priorAnswer,
        }),
        signal: controller.signal,
      });

      const detectedSubject = res.headers.get("X-Detected-Subject") ?? "";
      setSubject(detectedSubject);
      detectedSubjectRef.current = detectedSubject;

      if (!res.ok) {
        const ct = res.headers.get("content-type") ?? "";
        if (res.status === 400 && ct.includes("text/plain")) {
          const t = await res.text();
          setAnswer(t);
          return;
        }
        throw new Error("API error");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No response");

      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setAnswer(text);
      }
      // Store for potential follow-up
      priorContextRef.current = { question: trimmed, answer: text };

      // ── Award stars + update streak on answer received ──────────────────
      if (text.trim()) {
        const detSub = detectedSubjectRef.current || "general";
        const { state: gs, newBadges } = recordQuestion(trimmed.slice(0, 60), detSub);
        setGameState(gs);
        currentTopicRef.current = trimmed.slice(0, 60);
        currentSubjectRef.current = detSub;
        if (newBadges.length > 0) {
          badgeQueueRef.current.push(...newBadges);
          if (!pendingBadge) drainBadgeQueue();
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(language === "hi" ? "कुछ गड़बड़ हुई। दोबारा कोशिश करो।" : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Badge queue drain ────────────────────────────────────────────────────
  const drainBadgeQueue = useCallback(() => {
    const next = badgeQueueRef.current.shift();
    if (next) setPendingBadge(next);
  }, []);

  const handleBadgeDismiss = useCallback(() => {
    setPendingBadge(null);
    const next = badgeQueueRef.current.shift();
    if (next) setTimeout(() => setPendingBadge(next), 200);
  }, []);

  // ── Explain differently ─────────────────────────────────────────────────────
  const handleExplainDifferently = useCallback(() => {
    const ctx = priorContextRef.current;
    if (!ctx) return;
    submitWithQuestion(ctx.question, { priorQuestion: ctx.question, priorAnswer: ctx.answer });
  }, [submitWithQuestion]);

  // ── Speech input ─────────────────────────────────────────────────────────────
  const handleSpeechResult = useCallback(
    (transcript: string) => {
      setQuestion(transcript);
      submitWithQuestion(transcript);
    },
    [submitWithQuestion]
  );

  const {
    start: startListening,
    stop: stopListening,
    listening,
    supported: sttSupported,
    error: sttError,
  } = useSpeechRecognition(handleSpeechResult, {
    lang: sttLangForAppLanguage(language),
  });

  // ── TTS ──────────────────────────────────────────────────────────────────────
  const speakAnswer = useCallback(async (textToSpeak?: string, ageToUse?: number) => {
    const text = textToSpeak ?? answer;
    const currentAge = ageToUse ?? ageRef.current;
    if (!text.trim()) return;

    setUnreadAnswer(false); // clear the pulse — user has tapped or auto-play fired
    setTtsLoading(true);
    try {
      await piperTts.speak(
        text,
        () => {},
        () => setSpeaking(false),
        languageRef.current,
        currentAge
      );
      setSpeaking(true);
    } catch {
      // silent — TTS failing shouldn't break the UI
    } finally {
      setTtsLoading(false);
    }
  }, [answer]);

  const stopSpeaking = useCallback(() => {
    piperTts.stop();
    setSpeaking(false);
  }, []);

  // ── Difficulty feedback & age adaptation ──────────────────────────────────
  const handleDifficulty = useCallback((vote: "easy" | "hard") => {
    setDifficultyScore(prev => {
      const next = Math.max(-5, Math.min(5, prev + (vote === "easy" ? 1 : -1)));
      if (next <= -3 && ageRef.current > 7)  setShowAdaptSuggestion("simpler");
      else if (next >= 3 && ageRef.current < 13) setShowAdaptSuggestion("harder");
      else setShowAdaptSuggestion(null);
      return next;
    });
  }, []);

  // ── Quick check submit ────────────────────────────────────────────────────
  const handleQuickCheckSubmit = useCallback(async () => {
    const ctx = priorContextRef.current;
    if (!quickCheckInput.trim() || !ctx) return;
    setCheckingAnswer(true);
    setQuickCheckFeedback("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: ctx.question,
          age: ageRef.current,
          language: languageRef.current,
          quickCheckAnswer: quickCheckInput.trim(),
          originalAnswer: ctx.answer,
        }),
      });
      if (res.ok) {
        const feedback = await res.text();
        setQuickCheckFeedback(feedback);
        // Award stars based on pass/fail
        const passed = /right|correct|🎉|बहुत अच्छा|शाबाश/i.test(feedback);
        const { state: gs, newBadges } = recordQuickCheck(
          currentTopicRef.current,
          passed,
          currentSubjectRef.current
        );
        setGameState(gs);
        if (newBadges.length > 0) {
          badgeQueueRef.current.push(...newBadges);
          if (!pendingBadge) drainBadgeQueue();
        }
      }
    } catch {
      // silent
    } finally {
      setCheckingAnswer(false);
    }
  }, [quickCheckInput, pendingBadge, drainBadgeQueue]);

  // ── Voice input for Quick check (young ages) ─────────────────────────────
  const startQuickCheckListening = useCallback(() => {
    if (typeof window === "undefined") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition = new SR() as any;
    recognition.lang = languageRef.current === "hi" ? "hi-IN" : "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (e: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      const transcript: string = e.results[0][0].transcript;
      setQuickCheckInput(transcript);
      setQuickCheckListening(false);
    };
    recognition.onerror = () => setQuickCheckListening(false);
    recognition.onend   = () => setQuickCheckListening(false);
    setQuickCheckListening(true);
    recognition.start();
  }, []);

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [answer]);

  useEffect(() => { piperTts.preload().catch(() => {}); }, []);

  useEffect(() => {
    const storedAge = sessionStorage.getItem(AGE_STORAGE_KEY);
    if (storedAge) setAge(parseInt(storedAge, 10));
    const storedLang = sessionStorage.getItem(LANG_STORAGE_KEY);
    if (storedLang === "en" || storedLang === "hi") setLanguage(storedLang);
  }, []);

  useEffect(() => { sessionStorage.setItem(AGE_STORAGE_KEY, String(age)); }, [age]);
  useEffect(() => { sessionStorage.setItem(LANG_STORAGE_KEY, language); }, [language]);

  useEffect(() => {
    if (!loading && answer.trim() && answer !== lastSpokenAnswerRef.current) {
      lastSpokenAnswerRef.current = answer;
      if (isCapacitorApp) {
        // Android WebView blocks speechSynthesis.speak() unless called from a
        // direct tap. Show a pulsing "Tap to listen" hint on the button instead.
        setUnreadAnswer(true);
      } else {
        speakAnswer(answer, ageRef.current);
      }
    }
    if (!answer.trim()) {
      lastSpokenAnswerRef.current = "";
      setUnreadAnswer(false);
    }
  }, [loading, answer, speakAnswer, isCapacitorApp]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const sections    = answer ? parseAnswerSections(answer, language) : [];
  const subjectMeta = subject ? (SUBJECT_META[subject] ?? SUBJECT_META["general"]!) : null;
  const hasAnswer   = !loading && answer.trim().length > 0;
  const isYoungAge  = age <= 7;
  const pendingBadgeDef = pendingBadge ? (BADGE_DEFS[pendingBadge] ?? null) : null;
  const weeklySummaryData = showWeekly ? getWeeklySummary() : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitWithQuestion(question);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <Head><title>DoubtSolver</title></Head>

      <div className="min-h-screen flex justify-center p-5 pb-10 bg-gradient-to-br from-indigo-100 to-sky-100">
        <div className="w-full max-w-[440px] flex flex-col gap-4">

          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-indigo-800">DoubtSolver</h1>
            <button
              type="button"
              onClick={() => setShowWeekly(true)}
              className="text-xs px-3 py-1.5 rounded-full bg-white border border-indigo-100 shadow-sm text-indigo-600 font-medium hover:bg-indigo-50 transition"
            >
              📊 {language === "hi" ? "इस हफ्ते" : "This week"}
            </button>
          </div>
          <p className="text-center text-gray-500 text-sm -mt-2">
            {language === "hi" ? "कुछ भी पूछो। मैं सरल भाषा में समझाऊंगा।" : "Ask anything. I'll explain simply."}
          </p>

          {/* Stars + Streak + Badge shelf */}
          <StarStreak gameState={gameState} language={language} />

          {/* Language selector */}
          <div>
            <p className="text-gray-700 font-medium text-sm mb-2">
              {language === "hi" ? "जवाब की भाषा" : "Answer language"}
            </p>
            <div className="flex gap-2">
              {LANG_OPTIONS.map((opt) => (
                <button
                  key={opt.value} type="button"
                  onClick={() => setLanguage(opt.value)}
                  className={`flex-1 py-2.5 px-1 rounded-xl border cursor-pointer transition text-sm font-medium ${
                    language === opt.value
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-white border-gray-200 hover:border-indigo-300 text-gray-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Age selector */}
          <div>
            <p className="text-gray-700 font-medium text-sm mb-2">
              {language === "hi" ? "तुम्हारी उम्र" : "Your age"}
            </p>
            <div className="flex gap-2">
              {AGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value} type="button"
                  onClick={() => { setAge(opt.value); setDifficultyScore(0); setShowAdaptSuggestion(null); }}
                  className={`flex-1 py-2.5 px-1 rounded-xl border cursor-pointer transition text-xs sm:text-sm font-medium ${
                    age === opt.value
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-white border-gray-200 hover:border-indigo-300 text-gray-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Question input */}
          <form onSubmit={handleSubmit} className="flex gap-2 items-stretch">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={language === "hi" ? "अपना सवाल लिखो…" : "Type your question…"}
              className="flex-1 min-w-0 py-2.5 px-3 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
            />
            <button
              type="submit" disabled={!question.trim() || loading}
              className="shrink-0 py-2.5 px-4 rounded-xl bg-indigo-600 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition"
            >
              {language === "hi" ? "पूछो" : "Ask"}
            </button>
            {sttSupported && (
              <button
                type="button"
                onMouseDown={startListening} onMouseUp={stopListening} onMouseLeave={stopListening}
                onTouchStart={(e) => { e.preventDefault(); startListening(); }}
                onTouchEnd={(e) => { e.preventDefault(); stopListening(); }}
                className={`shrink-0 w-12 sm:w-14 rounded-xl text-white text-lg flex items-center justify-center shadow-sm transition ${
                  listening ? "bg-red-500" : "bg-pink-500 hover:bg-pink-600"
                }`}
                aria-label="Hold to talk" title="Hold to talk"
              >
                🎤
              </button>
            )}
          </form>

          {/* ── Answer area ────────────────────────────────────────────── */}

          {/* Subject badge + TTS row */}
          {(subjectMeta || hasAnswer) && (
            <div className="flex items-center justify-between min-h-[28px]">
              {subjectMeta ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-gray-200 text-xs font-medium text-gray-600 shadow-sm">
                  {subjectMeta.icon} {subjectMeta.label}
                </span>
              ) : <span />}
              {hasAnswer && (
                <button
                  type="button"
                  onClick={speaking ? stopSpeaking : () => speakAnswer()}
                  disabled={ttsLoading}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium shadow-sm transition disabled:opacity-50 ${
                    speaking
                      ? "bg-red-50 border border-red-200 text-red-600 hover:bg-red-100"
                      : unreadAnswer
                        ? "bg-indigo-600 text-white border border-indigo-600 animate-pulse hover:bg-indigo-700"
                        : "bg-white border border-gray-200 text-indigo-600 hover:bg-indigo-50"
                  }`}
                >
                  {ttsLoading
                    ? "…"
                    : speaking
                      ? "⏹ Stop"
                      : unreadAnswer
                        ? "🔊 Tap to listen!"
                        : "🔊 Listen"}
                </button>
              )}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-indigo-500 text-sm animate-pulse">
                {language === "hi" ? "सोच रहा हूँ…" : "Thinking…"}
              </p>
            </div>
          )}

          {/* Structured section cards */}
          {!loading && sections.length > 0 && sections.map((section, i) => {
            const cfg = SECTION_CONFIG[section.type];

            if (section.type === "check") {
              return (
                <div key={i} className={`rounded-2xl border p-4 ${cfg.bg} ${cfg.border}`}>
                  <p className={`text-xs font-semibold mb-2 ${cfg.headingColor}`}>
                    {cfg.icon} {section.heading || (language === "hi" ? "जल्दी जाँच" : "Quick check")}
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed mb-3 whitespace-pre-wrap">
                    {section.content}
                  </p>

                  {!quickCheckFeedback ? (
                    <div className="flex gap-2">
                      {/* Mic button for young ages — shown before the input */}
                      {isYoungAge && (
                        <button
                          type="button"
                          onMouseDown={startQuickCheckListening}
                          onTouchStart={(e) => { e.preventDefault(); startQuickCheckListening(); }}
                          className={`shrink-0 w-10 h-10 rounded-lg text-white text-base flex items-center justify-center transition ${
                            quickCheckListening ? "bg-red-500" : "bg-pink-500 hover:bg-pink-600"
                          }`}
                          aria-label="Speak your answer"
                          title="Speak your answer"
                        >
                          {quickCheckListening ? "🔴" : "🎤"}
                        </button>
                      )}
                      <input
                        value={quickCheckInput}
                        onChange={(e) => setQuickCheckInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleQuickCheckSubmit()}
                        placeholder={
                          isYoungAge
                            ? (language === "hi" ? "बोलो या लिखो…" : "Speak or type…")
                            : (language === "hi" ? "अपना जवाब लिखो…" : "Your answer…")
                        }
                        className="flex-1 text-sm py-1.5 px-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-300"
                      />
                      <button
                        type="button" onClick={handleQuickCheckSubmit}
                        disabled={!quickCheckInput.trim() || checkingAnswer}
                        className="shrink-0 px-3 py-1.5 rounded-lg bg-purple-600 text-white text-sm font-medium disabled:opacity-50 hover:bg-purple-700 transition"
                      >
                        {checkingAnswer ? "…" : (language === "hi" ? "जाँचो ✓" : "Check ✓")}
                      </button>
                    </div>
                  ) : (
                    <div className={`text-sm rounded-xl p-3 leading-relaxed ${
                      /right|correct|🎉|बहुत अच्छा/i.test(quickCheckFeedback)
                        ? "bg-green-100 text-green-800 border border-green-200"
                        : "bg-orange-50 text-orange-800 border border-orange-200"
                    }`}>
                      {quickCheckFeedback}
                      <button
                        type="button"
                        onClick={() => { setQuickCheckFeedback(""); setQuickCheckInput(""); }}
                        className="ml-2 text-xs underline opacity-60 hover:opacity-100"
                      >
                        {language === "hi" ? "फिर कोशिश करो" : "Try again"}
                      </button>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div key={i} className={`rounded-2xl border p-4 ${cfg.bg} ${cfg.border}`}>
                {section.heading && (
                  <p className={`text-xs font-semibold mb-2 ${cfg.headingColor}`}>
                    {cfg.icon} {section.heading}
                  </p>
                )}
                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {section.content}
                </p>
              </div>
            );
          })}

          {/* Fallback: raw text if parsing found no sections */}
          {!loading && answer && sections.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{answer}</p>
            </div>
          )}

          {/* Empty state */}
          {!answer && !loading && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center justify-center min-h-[100px]">
              <p className="text-gray-400 text-sm text-center">
                {language === "hi"
                  ? "सवाल पूछने के बाद यहाँ जवाब आएगा।"
                  : "Your answer will appear here after you ask."}
              </p>
            </div>
          )}

          {/* Post-answer actions */}
          {hasAnswer && (
            <div className="flex flex-col gap-2.5">

              {/* Difficulty feedback */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-500">
                  {language === "hi" ? "क्या यह समझ आया?" : "Was this easy to understand?"}
                </span>
                <button
                  type="button" onClick={() => handleDifficulty("easy")}
                  className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium hover:bg-green-200 transition"
                >
                  👍 {language === "hi" ? "हाँ" : "Yes"}
                </button>
                <button
                  type="button" onClick={() => handleDifficulty("hard")}
                  className="px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-medium hover:bg-orange-200 transition"
                >
                  🤔 {language === "hi" ? "नहीं" : "Not really"}
                </button>
              </div>

              {/* Explain differently */}
              <button
                type="button" onClick={handleExplainDifferently}
                className="w-full py-2.5 rounded-xl border border-indigo-200 bg-white text-indigo-600 text-sm font-medium hover:bg-indigo-50 transition shadow-sm"
              >
                🔄 {language === "hi" ? "अलग तरीके से समझाओ" : "Explain this differently"}
              </button>
            </div>
          )}

          {/* Age adaptation suggestion */}
          {showAdaptSuggestion && (
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-yellow-50 border border-yellow-200">
              <span className="text-yellow-800 text-sm">
                {showAdaptSuggestion === "simpler"
                  ? (language === "hi" ? "क्या और सरल शब्दों में बताऊं?" : "Want me to use even simpler words?")
                  : (language === "hi" ? "क्या थोड़ी ज़्यादा जानकारी चाहिए?" : "Ready for a bit more detail?")}
              </span>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const ageOpts = [6, 8, 10, 13];
                    const idx = ageOpts.indexOf(ageRef.current);
                    const newAge = showAdaptSuggestion === "simpler"
                      ? ageOpts[Math.max(0, idx - 1)]!
                      : ageOpts[Math.min(ageOpts.length - 1, idx + 1)]!;
                    setAge(newAge);
                    setDifficultyScore(0);
                    setShowAdaptSuggestion(null);
                  }}
                  className="px-3 py-1 rounded-lg bg-yellow-500 text-white text-xs font-medium hover:bg-yellow-600 transition"
                >
                  {language === "hi" ? "हाँ" : "Yes"}
                </button>
                <button
                  type="button"
                  onClick={() => { setDifficultyScore(0); setShowAdaptSuggestion(null); }}
                  className="px-3 py-1 rounded-lg bg-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-300 transition"
                >
                  {language === "hi" ? "नहीं" : "No"}
                </button>
              </div>
            </div>
          )}

          {/* Errors */}
          {(error || sttError) && (
            <p className="text-red-500 text-sm">{error ?? sttError}</p>
          )}

          {/* Topic mastery panel */}
          <TopicMastery topics={gameState.topics} language={language} />

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Badge toast — fixed, outside scroll container */}
      <BadgeToast badge={pendingBadgeDef} onDismiss={handleBadgeDismiss} />

      {/* Weekly summary modal */}
      {showWeekly && weeklySummaryData && (
        <WeeklySummary
          data={weeklySummaryData}
          language={language}
          onClose={() => setShowWeekly(false)}
        />
      )}
    </>
  );
}
