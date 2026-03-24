/**
 * Normalizes questions so that semantically equivalent phrasings hit the same cache.
 *
 * Caching strategy:
 * - Cache key = normalizeQuestion(question) + "|" + age
 * - Question TYPE is preserved: what ≠ why ≠ how (different answers)
 * - Same type + same topic, different wording → same key
 *   e.g. "why does earth rotate" = "why does earth spin" (synonym)
 *   e.g. "why does the earth rotate" = "why does earth rotate" (article)
 * - Different ages → different keys (answers vary by age band)
 *
 * Normalization steps:
 * 1. Lowercase, remove punctuation, expand contractions
 * 2. Extract and preserve question type (what/why/how/where/when/who/explain)
 * 3. Extract topic, remove articles, normalize synonyms, stem
 * 4. Return "{type}|{topic}"
 */

import * as fs from "fs";
import * as path from "path";

let synonymMap: Record<string, string[]> | null = null;

function loadSynonyms(): Record<string, string[]> {
  if (synonymMap) return synonymMap;
  try {
    const p = path.join(process.cwd(), "prompts", "question-synonyms.json");
    const raw = fs.readFileSync(p, "utf-8");
    synonymMap = JSON.parse(raw) as Record<string, string[]>;
    return synonymMap;
  } catch {
    synonymMap = {};
    return synonymMap;
  }
}

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function removePunctuation(s: string): string {
  return s.replace(/[.,?!'"()]/g, "");
}

function expandContractions(s: string): string {
  return s
    .replace(/\bwhat's\b/gi, "what is")
    .replace(/\bhow's\b/gi, "how is")
    .replace(/\bwhy's\b/gi, "why is")
    .replace(/\bwhere's\b/gi, "where is")
    .replace(/\bwhen's\b/gi, "when is")
    .replace(/\bwho's\b/gi, "who is")
    .replace(/\bthat's\b/gi, "that is")
    .replace(/\bit's\b/gi, "it is")
    .replace(/\bthere's\b/gi, "there is")
    .replace(/\bhere's\b/gi, "here is");
}

function removeArticles(s: string): string {
  return s.replace(/\b(the|a|an)\b/gi, " ").replace(/\s+/g, " ").trim();
}

/** Extracts question type (what/why/how/...) and topic. Type is preserved for cache separation. */
function extractTypeAndTopic(s: string): { type: string; topic: string } {
  const lower = s.toLowerCase();

  const typePatterns: Array<{ type: string; regex: RegExp }> = [
    { type: "what", regex: /\bwhat\s+(is|are|was|were|do|does|did|makes|causes)\b/i },
    { type: "why", regex: /\bwhy\s+(is|are|was|were|do|does|did|is\s+it\s+that)\b/i },
    { type: "how", regex: /\bhow\s+(is|are|do|does|did|can|could|come)\b/i },
    { type: "where", regex: /\bwhere\s+(is|are|do|does|did)\b/i },
    { type: "when", regex: /\bwhen\s+(is|are|do|does|did)\b/i },
    { type: "who", regex: /\bwho\s+(is|are|was|were|do|does|did)\b/i },
    { type: "explain", regex: /\b(explain|describe|tell\s+me\s+about)\b/i },
  ];

  let type = "other";
  let topic = s;

  for (const { type: t, regex } of typePatterns) {
    if (regex.test(lower)) {
      type = t;
      break;
    }
  }

  const stripPatterns: Array<[RegExp, string]> = [
    [/\b(what|why|how|where|when|who)\s+(is|are|was|were|do|does|did)\b/gi, ""],
    [/\b(what\s+makes|what\s+causes)\b/gi, ""],
    [/\b(why\s+is\s+it\s+that|how\s+come)\b/gi, ""],
    [/\b(why does it|how does it)\b/gi, ""],
    [/\b(explain|describe|tell\s+me\s+about)\s+(to\s+me\s+)?(about\s+)?/gi, ""],
    [/\b(can\s+you\s+explain|could\s+you\s+explain|please\s+explain)\b/gi, ""],
    [/\b(in\s+simple\s+words?|in\s+easy\s+words?)\b/gi, ""],
  ];

  for (const [regex, replacement] of stripPatterns) {
    topic = topic.replace(regex, replacement);
  }

  return { type, topic };
}

function simpleStem(word: string): string {
  if (word.length < 3) return word;

  if (word.endsWith("ies")) return word.slice(0, -3) + "y";
  if (word.endsWith("ed") && word.length > 4 && !word.endsWith("eed")) return word.slice(0, -2);

  if (word.endsWith("es")) {
    const before = word.slice(0, -2);
    const last = before.slice(-1);
    if ("sxz".includes(last) || before.endsWith("ch") || before.endsWith("sh")) return before;
    return word.slice(0, -1);
  }
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);

  return word;
}

function stemPhrase(s: string): string {
  return s
    .split(" ")
    .map((word) => simpleStem(word))
    .join(" ");
}

function normalizeSynonyms(s: string): string {
  let out = s;
  const synonyms = loadSynonyms();

  for (const [canonical, variants] of Object.entries(synonyms)) {
    const allForms = [canonical, ...variants].filter(Boolean);
    if (allForms.length === 0) continue;
    const pattern = new RegExp(`\\b(${allForms.join("|")})\\b`, "gi");
    out = out.replace(pattern, canonical);
  }

  return out;
}

export function normalizeQuestion(question: string): string {
  let s = question.trim().toLowerCase();
  s = removePunctuation(s);
  s = expandContractions(s);

  const { type, topic } = extractTypeAndTopic(s);
  let normalizedTopic = topic;
  normalizedTopic = removeArticles(normalizedTopic);
  normalizedTopic = normalizeSynonyms(normalizedTopic);
  normalizedTopic = stemPhrase(normalizedTopic);
  normalizedTopic = normalizeWhitespace(normalizedTopic);

  const result = `${type}|${normalizedTopic || "unknown"}`;
  return result || question.trim().toLowerCase();
}
