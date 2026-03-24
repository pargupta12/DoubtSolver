import { normalizeQuestion } from "./question-normalizer";
import { getAgeBand } from "./prompt-builder";
import type { AppLanguage } from "./answer-language";

const MAX_ENTRIES = 150;

/**
 * Response cache keyed by (normalized question, age).
 * Question type (what/why/how/where/when/who) is preserved—different types get different keys.
 * Same type + same topic (e.g. "why does earth rotate" vs "why does earth spin") hit the same entry.
 */

interface CacheEntry {
  response: string;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const keyOrder: string[] = [];

function evictOldest(): void {
  while (keyOrder.length >= MAX_ENTRIES) {
    const oldest = keyOrder.shift();
    if (oldest) cache.delete(oldest);
  }
}

function getCacheKey(question: string, age: number, language: AppLanguage): string {
  const normalized = normalizeQuestion(question);
  const ageBand = getAgeBand(age); // "6-8", "9-11", "12-15" — avoids separate entries for ages 7 vs 8
  return `${normalized}|${ageBand}|${language}`;
}

export function get(
  question: string,
  age: number,
  language: AppLanguage
): string | null {
  const key = getCacheKey(question, age, language);
  const entry = cache.get(key);
  if (!entry) return null;
  return entry.response;
}

export function set(
  question: string,
  age: number,
  language: AppLanguage,
  response: string
): void {
  const key = getCacheKey(question, age, language);
  if (cache.has(key)) {
    cache.set(key, { response, timestamp: Date.now() });
    return;
  }
  evictOldest();
  cache.set(key, { response, timestamp: Date.now() });
  keyOrder.push(key);
}
