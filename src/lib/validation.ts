import { readFileSync } from "fs";
import { join } from "path";

const BLOCKLIST = readFileSync(
  join(process.cwd(), "prompts", "blocklist.txt"),
  "utf-8"
)
  .split("\n")
  .map((w) => w.trim().toLowerCase())
  .filter(Boolean);

// ── Word limits (math answers are exempt — they need numbered steps) ──────────
const AGE_LIMITS: Record<string, number> = {
  "6-9":   90,
  "10-11": 140,
  "12-15": 200,
};

// ── Max words per sentence ────────────────────────────────────────────────────
const SENTENCE_WORD_CAPS: Record<string, number> = {
  "6-9":   12,
  "10-11": Infinity,
  "12-15": Infinity,
};

// ── Flesch-Kincaid target grade ceiling ───────────────────────────────────────
const FK_GRADE_LIMITS: Record<string, number> = {
  "6-9":   3.5,
  "10-11": 5.5,
  "12-15": 9.0,  // effectively no cap
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export function hasBlocklistedWords(text: string): string[] {
  const lower = text.toLowerCase();
  return BLOCKLIST.filter((word) => {
    const regex = new RegExp(`\\b${word}\\b`, "i");
    return regex.test(lower);
  });
}

/**
 * Word count using Intl.Segmenter when available (handles Devanagari correctly).
 */
export function countWordsUnicode(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  try {
    if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
      const Segmenter = (
        Intl as unknown as {
          Segmenter: new (
            locales?: string,
            options?: { granularity?: string }
          ) => { segment: (s: string) => Iterable<{ isWordLike?: boolean }> };
        }
      ).Segmenter;
      const seg = new Segmenter("und", { granularity: "word" });
      let n = 0;
      for (const part of seg.segment(trimmed)) {
        if (part.isWordLike) n++;
      }
      return n;
    }
  } catch {
    // fall through
  }
  return trimmed.split(/\s+/).filter(Boolean).length;
}

export function exceedsWordLimit(
  text: string,
  ageBand: string,
  isMath = false
): boolean {
  if (isMath) return false;
  const limit = AGE_LIMITS[ageBand] ?? 200;
  return countWordsUnicode(text) > limit;
}

// ── Syllable counter (English heuristic) ─────────────────────────────────────

function countSyllablesEn(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  // Strip silent trailing 'e'
  const stripped = w.replace(/e$/, "");
  const groups = stripped.match(/[aeiouy]+/g);
  return Math.max(1, groups ? groups.length : 1);
}

// ── Strip answer structure for readability analysis ───────────────────────────

function stripAnswerMarkup(text: string): string {
  return text
    .replace(/👉[^:\n]+:/g, " ")   // section headings
    .replace(/[•\-\*]\s/g, " ")     // bullets
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Flesch-Kincaid Grade Level (English only) ─────────────────────────────────

export function fleschKincaidGrade(text: string): number {
  const clean = stripAnswerMarkup(text);
  const sentences = clean
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);
  if (sentences.length === 0) return 0;

  const words = clean
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z]/g, ""))
    .filter((w) => w.length > 0);
  if (words.length === 0) return 0;

  const syllables = words.reduce((sum, w) => sum + countSyllablesEn(w), 0);
  const avgWordsPerSentence = words.length / sentences.length;
  const avgSyllablesPerWord = syllables / words.length;

  return 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59;
}

// ── Sentence length check ─────────────────────────────────────────────────────

/**
 * Returns the number of sentences that exceed the word cap for the age band.
 * Only enforced for the 6-9 band (12-word cap).
 */
export function countLongSentences(text: string, ageBand: string): number {
  const cap = SENTENCE_WORD_CAPS[ageBand] ?? Infinity;
  if (!isFinite(cap)) return 0;

  const clean = stripAnswerMarkup(text);
  const sentences = clean
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return sentences.filter(
    (s) => s.split(/\s+/).filter((w) => w.length > 0).length > cap
  ).length;
}

// ── Main validation entry point ───────────────────────────────────────────────

export function validateResponse(
  text: string,
  ageBand: string,
  isMath = false
): {
  valid: boolean;
  jargon: string[];
  tooLong: boolean;
  readabilityGrade: number;
  readabilityFails: boolean;
  longSentenceCount: number;
  sentenceLengthFails: boolean;
} {
  const jargon              = hasBlocklistedWords(text);
  const tooLong             = exceedsWordLimit(text, ageBand, isMath);
  const readabilityGrade    = fleschKincaidGrade(text);
  const fkLimit             = FK_GRADE_LIMITS[ageBand] ?? 9.0;
  const readabilityFails    = !isMath && readabilityGrade > fkLimit;
  const longSentenceCount   = isMath ? 0 : countLongSentences(text, ageBand);
  const sentenceLengthFails = longSentenceCount > 0;

  return {
    valid: jargon.length === 0 && !tooLong && !readabilityFails && !sentenceLengthFails,
    jargon,
    tooLong,
    readabilityGrade,
    readabilityFails,
    longSentenceCount,
    sentenceLengthFails,
  };
}
