"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface SpeechRecognitionInstance {
  continuous: boolean;
  lang: string;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

export type SpeechRecognitionLang = "en-US" | "hi-IN";

export function useSpeechRecognition(
  onResult: (transcript: string) => void,
  options?: { lang?: SpeechRecognitionLang }
) {
  const lang = options?.lang ?? "en-US";
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    const SpeechRecognitionAPI =
      typeof window !== "undefined"
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : undefined;
    setSupported(!!SpeechRecognitionAPI);

    if (SpeechRecognitionAPI) {
      recognitionRef.current = new SpeechRecognitionAPI();
      const rec = recognitionRef.current;
      rec.continuous = false;
      rec.lang = lang;
      rec.interimResults = false;

      rec.onresult = (e: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => {
        const transcript = e.results[0]?.[0]?.transcript ?? "";
        if (transcript) onResultRef.current(transcript);
        setListening(false);
      };

      rec.onend = () => setListening(false);

      rec.onerror = (e: { error: string }) => {
        setListening(false);
        if (e.error === "not-allowed") {
          setError("Microphone access denied");
        } else if (e.error === "no-speech") {
          setError(null);
        } else {
          setError(e.error || "Speech recognition error");
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
    };
  }, [lang]);

  const start = useCallback(() => {
    setError(null);
    if (!recognitionRef.current || listening) return;
    try {
      recognitionRef.current.lang = lang;
      recognitionRef.current.start();
      setListening(true);
    } catch (err) {
      setError("Could not start listening");
      setListening(false);
    }
  }, [listening, lang]);

  const stop = useCallback(() => {
    if (recognitionRef.current && listening) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setListening(false);
    }
  }, [listening]);

  return { start, stop, listening, supported, error };
}
