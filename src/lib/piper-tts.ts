/**
 * TTS abstraction layer:
 *
 *  ┌─ Running inside Capacitor (Android APK)
 *  │   → @capacitor-community/text-to-speech  (native Android TTS engine)
 *  │     Works on every Android device regardless of WebView version.
 *  │     IMPORTANT: we use "void speak()" — we never call .then() on the
 *  │     plugin result because Capacitor's proxy intercepts all property
 *  │     access (including ".then") and forwards it to native as a method
 *  │     call, throwing "then() is not implemented on android".
 *  │     onEnd is driven by a speech-duration timer instead.
 *  │
 *  └─ Running in a regular browser (desktop / PWA)
 *      → window.speechSynthesis  (Web Speech API)
 */

import type { AppLanguage } from "./answer-language";

// ── Environment helpers ────────────────────────────────────────────────────────

function isNativeApp(): boolean {
  return (
    typeof window !== "undefined" &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    !!(window as any).Capacitor
  );
}

function webTtsAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof window.speechSynthesis === "object" &&
    window.speechSynthesis !== null
  );
}

// ── Cached native TTS module ──────────────────────────────────────────────────
//
// IMPORTANT: _nativeTTS is the Capacitor plugin proxy.  The Capacitor bridge
// intercepts *every* property access on that object — including ".then".
// That means if we ever pass _nativeTTS through an async function (even just
// `return _nativeTTS` inside an `async` function), JavaScript calls
// Promise.resolve(_nativeTTS), sees the proxy has a ".then" property, treats
// it as a thenable, and invokes ".then()" on it → "then() is not implemented
// on android".
//
// Fix: ensureNativeTTS() returns Promise<void> (never the proxy object).
// After awaiting it, callers access _nativeTTS directly (synchronously).
//
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _nativeTTS: any = null;
let _nativeTTSReady = false;

async function ensureNativeTTS(): Promise<void> {
  if (_nativeTTSReady) return;          // already loaded — plain void return, safe
  const mod = await import("@capacitor-community/text-to-speech");
  _nativeTTS = mod.TextToSpeech;        // store the proxy in a module-level var
  _nativeTTSReady = true;               // return void — Promise.resolve(undefined)
}

// Timer used to fire onEnd after estimated speech duration
let _nativeSpeakTimer: ReturnType<typeof setTimeout> | null = null;

// ── Text preprocessing ─────────────────────────────────────────────────────────

function expandMathForSpeech(t: string): string {
  const FRACTION_WORDS: Record<string, string> = {
    "2": "half",    "3": "third",   "4": "fourth",
    "5": "fifth",   "6": "sixth",   "7": "seventh",
    "8": "eighth",  "10": "tenth",
  };
  t = t.replace(/\b(\d+)\/(\d+)\b/g, (_, num, den) => {
    const word = FRACTION_WORDS[den as string];
    return word ? `${num} ${word}` : `${num} over ${den}`;
  });
  t = t.replace(/×/g,                 " times ");
  t = t.replace(/÷/g,                 " divided by ");
  t = t.replace(/(\d)\s*\*\s*(\d)/g, "$1 times $2");
  t = t.replace(/(\d)\s*-\s*(\d)/g,  "$1 minus $2");
  t = t.replace(/(\d)\s*\+\s*(\d)/g, "$1 plus $2");
  t = t.replace(/(\d)\s*=\s*(\d)/g,  "$1 equals $2");
  t = t.replace(/(\d)\s*=\s*\?/g,    "$1 equals what");
  t = t.replace(/\^(\d+)/g,          " to the power of $1");
  return t;
}

function sanitizeTextForSpeech(raw: string): string {
  let t = raw.replace(/^\uFEFF/, "");

  // Section headings → spoken pauses
  t = t.replace(/👉\s*What is it\s*:/gi,             "... What is it. ");
  t = t.replace(/👉\s*How does it work\s*:/gi,        "... How does it work. ");
  t = t.replace(/👉\s*Why is it cool\s*:/gi,          "... And here is why it is so cool. ");
  t = t.replace(/👉\s*Example\s*:/gi,                 "... For example. ");
  t = t.replace(/👉\s*Quick check\s*:/gi,             "... Quick check. ");
  t = t.replace(/👉\s*यह क्या है\s*:/g,              "... यह क्या है। ");
  t = t.replace(/👉\s*यह कैसे काम करता है\s*:/g,     "... यह कैसे काम करता है। ");
  t = t.replace(/👉\s*यह मज़ेदार क्यों है\s*:/g,     "... और यह इतना मज़ेदार क्यों है। ");
  t = t.replace(/👉\s*उदाहरण\s*:/g,                  "... उदाहरण। ");
  t = t.replace(/👉\s*जल्दी जाँच\s*:/g,              "... जल्दी जाँच। ");

  t = t.replace(/\u00A0/g, " ");
  t = t.replace(/[\u200B-\u200D\u2060\uFEFF]/g, "");
  t = t.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");
  t = t.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  t = t.replace(/https?:\/\/[^\s\]>]+/gi, " ");
  t = t.replace(/\bwww\.[^\s]+/gi, " ");
  t = t.replace(/\*\*([^*]+)\*\*/g, "$1");
  t = t.replace(/__([^_]+)__/g,     "$1");
  t = t.replace(/~~([^~]+)~~/g,     "$1");
  t = t.replace(/`([^`\n]+)`/g,     "$1");
  t = t.replace(/\*([^*\n]+)\*/g,   "$1");
  t = t.replace(/_([^_\n]+)_/g,     "$1");
  t = t.replace(/\|/g, " ");
  t = t.replace(/^[ \t]*>[ \t]?/gm, "");

  t = t
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/^\s*#{1,6}\s+/, "")
        .replace(/^\s*\d+[.)]\s+/, "")
        .replace(/^\s*[-–—*+]\s+/, "")
        .trimEnd()
    )
    .join("\n");

  t = t.replace(/\p{Extended_Pictographic}/gu, "").replace(/\uFE0F/g, "").replace(/\u200D/g, "");
  t = t.replace(/[•‣⁃◦·▪▸▹►◎○●■□▪▫]/g, " ");
  t = t.replace(/[\u2190-\u21FF\u27F0-\u27FF\u2900-\u297F]/g, " ");
  t = t.replace(/[\u2500-\u257F]/g, " ");
  t = t.replace(/[\u25A0-\u25FF\u2600-\u26FF]/g, " ");

  t = expandMathForSpeech(t);

  t = t.replace(/\n{2,}/g, ". ");
  t = t.replace(/\n/g, " ");
  t = t.replace(/\s+/g, " ").trim();

  return t;
}

// ── Speech rate ────────────────────────────────────────────────────────────────

function rateForAge(age: number): number {
  if (age <= 8)  return 0.78;
  if (age <= 11) return 0.85;
  return 0.92;
}

/** Rough words-per-second at a given rate (native TTS on Android). */
function estimateDurationMs(text: string, rate: number): number {
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const wps = rate * 2.5; // ~2.5 words/sec at rate 1.0
  return Math.max(2000, Math.ceil((wordCount / wps) * 1000) + 1200);
}

// ── Web Speech API helpers (browser only) ─────────────────────────────────────

function getEnglishVoice(): SpeechSynthesisVoice | null {
  if (!webTtsAvailable()) return null;
  const v = window.speechSynthesis.getVoices();
  return (
    v.find((x) => x.lang.startsWith("en") && x.name.toLowerCase().startsWith("google")) ??
    v.find((x) =>
      x.lang.startsWith("en") &&
      /samantha|victoria|karen|sarah|emily|linda|amy|susan|nicole|anna|moira|sandra|helena|zira|aisha|lupe|vicki|kate|fiona/i.test(x.name)
    ) ??
    v.find((x) => x.lang.startsWith("en")) ??
    null
  );
}

function getHindiVoice(): SpeechSynthesisVoice | null {
  if (!webTtsAvailable()) return null;
  const v = window.speechSynthesis.getVoices();
  return (
    v.find((x) => x.lang.toLowerCase().startsWith("hi") && x.name.toLowerCase().startsWith("google")) ??
    v.find((x) => x.lang.toLowerCase().startsWith("hi")) ??
    v.find((x) => /hindi|हिंदी/i.test(x.name)) ??
    null
  );
}

function doWebSpeak(text: string, language: AppLanguage, rate: number, onEnd?: () => void): void {
  if (!webTtsAvailable()) { onEnd?.(); return; }
  const u = new SpeechSynthesisUtterance(text.trim());
  u.rate = rate;
  if (language === "hi") { u.lang = "hi-IN"; const v = getHindiVoice(); if (v) u.voice = v; }
  else                   { u.lang = "en-US"; const v = getEnglishVoice(); if (v) u.voice = v; }
  u.onend   = () => onEnd?.();
  u.onerror = () => onEnd?.();
  window.speechSynthesis.speak(u);
}

function webSpeakWhenReady(text: string, language: AppLanguage, rate: number, onEnd?: () => void): void {
  if (!webTtsAvailable()) { onEnd?.(); return; }
  const ss = window.speechSynthesis;
  if (ss.getVoices().length === 0) {
    ss.onvoiceschanged = () => { ss.onvoiceschanged = null; doWebSpeak(text, language, rate, onEnd); };
  } else {
    doWebSpeak(text, language, rate, onEnd);
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function preload(): Promise<void> {
  if (isNativeApp()) ensureNativeTTS().catch(() => {});
}

export async function speak(
  text: string,
  _onProgress?: (pct: number) => void,
  onEnd?: () => void,
  language: AppLanguage = "en",
  age = 10
): Promise<void> {
  stop(); // cancel any in-progress speech first

  const speechText = sanitizeTextForSpeech(text);
  if (!speechText) { onEnd?.(); return; }

  if (isNativeApp()) {
    try {
      // ensureNativeTTS() returns Promise<void> — it never passes the Capacitor
      // proxy through async/await, so Promise.resolve() never sees it as a
      // thenable and never calls ".then()" on the proxy.
      await ensureNativeTTS();

      // Access the proxy directly (synchronous) and immediately discard the
      // return value with void — never chain .then() on it.
      void _nativeTTS.speak({
        text: speechText,
        lang: language === "hi" ? "hi-IN" : "en-US",
        rate: rateForAge(age),
        pitch: 1.0,
        volume: 1.0,
      });

      const durationMs = estimateDurationMs(speechText, rateForAge(age));
      _nativeSpeakTimer = setTimeout(() => {
        _nativeSpeakTimer = null;
        onEnd?.();
      }, durationMs);

    } catch {
      onEnd?.();
    }
    return;
  }

  // Browser: Web Speech API
  webSpeakWhenReady(speechText, language, rateForAge(age), onEnd);
}

/** Stop current playback. Safe to call when nothing is playing. */
export function stop(): void {
  if (isNativeApp()) {
    // Cancel the duration timer
    if (_nativeSpeakTimer) {
      clearTimeout(_nativeSpeakTimer);
      _nativeSpeakTimer = null;
    }
    // Stop native TTS — void here too, same reason as speak()
    if (_nativeTTS) {
      void _nativeTTS.stop();
    }
    return;
  }
  if (webTtsAvailable()) {
    window.speechSynthesis.cancel();
  }
}

/** True when at least one TTS engine is available. */
export function isSupported(): boolean {
  return isNativeApp() || webTtsAvailable();
}
