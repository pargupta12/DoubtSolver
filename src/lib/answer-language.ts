/**
 * Student answer language for prompts, cache, TTS, and safe responses.
 */
export type AppLanguage = "en" | "hi";

export const VALID_LANGUAGES: AppLanguage[] = ["en", "hi"];

export function parseLanguage(raw: unknown): AppLanguage {
  if (raw === "hi" || raw === "en") {
    return raw;
  }
  return "en";
}

export function isAppLanguage(raw: unknown): raw is AppLanguage {
  return raw === "en" || raw === "hi";
}

const SAFE_BY_LANG: Record<AppLanguage, string> = {
  en: "I can only help with school topics like science, history, and geography. Try asking about those!",
  hi: "मैं सिर्फ स्कूल वाले विषयों में मदद कर सकती हूँ—जैसे विज्ञान, इतिहास और भूगोल। उनके बारे में पूछो!",
};

export function getSafeResponse(lang: AppLanguage): string {
  return SAFE_BY_LANG[lang];
}
