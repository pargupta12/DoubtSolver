import type { AppLanguage } from "./answer-language";
import { isMathQuestion } from "./math-question-detection";
import { detectMathTopic } from "./math-topic";

/**
 * Cheap post-checks for math answers. If true, one regeneration may help.
 * Intentionally imperfect — tune with logs / golden set.
 */
export function mathAnswerFailsGuard(question: string, answer: string): boolean {
  if (!isMathQuestion(question)) return false;

  const t = answer.trim();
  if (t.length < 100) return true;

  const hasSectionHeading =
    /👉\s*(What is it|यह क्या है)/i.test(t) || /^👉/m.test(t);
  if (!hasSectionHeading) return true;

  const topic = detectMathTopic(question);

  if (topic === "fractions_add_sub") {
    if (!/=/.test(t)) return true;
    const numberedSteps = t.match(/^\s*\d+\./gm) ?? [];
    if (numberedSteps.length < 6) return true;
    if (!/\d+\/\d+/.test(t)) return true;
    const fracs = question.match(/\d+\/\d+/g) ?? [];
    if (fracs.length >= 2) {
      const f0 = fracs[0];
      const f1 = fracs[1];
      if (!f0 || !f1) return true;
      const d1 = f0.split("/")[1] ?? "";
      const d2 = f1.split("/")[1] ?? "";
      if (d1 && d2 && d1 !== d2) {
        const smallEquations = t.match(/\d\s*[×x*]\s*\d\s*=\s*\d/gi) ?? [];
        const byPhrase =
          /\bby\s+\d\b/i.test(t) ||
          /\bbottom\s+by\s+\d\b/i.test(t) ||
          /ऊपर\s+भी\s+\d\s+से/i.test(t);
        if (smallEquations.length < 2 && !byPhrase) return true;

        const looksLikeSubtraction =
          /\d+\/\d+\s*-\s*\d+\/\d+/.test(question) ||
          /\b(minus|subtract)\b/i.test(question);
        const hasJoinedFractions = looksLikeSubtraction
          ? /\d+\/\d+\s*-\s*\d+\/\d+/.test(t)
          : /\d+\/\d+\s*\+\s*\d+\/\d+/.test(t);
        if (!hasJoinedFractions) return true;
      }
    }
  }

  if (topic === "whole_ops") {
    // Must show at least 3 numbered steps and contain an equals sign
    const numberedSteps = t.match(/^\s*\d+\./gm) ?? [];
    if (numberedSteps.length < 3) return true;
    if (!/=/.test(t)) return true;
    // Must include a number (intermediate or final result)
    if (!/\d/.test(t)) return true;
  }

  if (topic === "word_problem") {
    // Must contain an equation and at least one number
    if (!/=/.test(t)) return true;
    if (!/\d/.test(t)) return true;
    // Must have at least 2 numbered steps
    const numberedSteps = t.match(/^\s*\d+\./gm) ?? [];
    if (numberedSteps.length < 2) return true;
  }

  return false;
}

export function buildMathRegenerationUserPrompt(
  question: string,
  priorAnswer: string,
  childAge: number,
  language: AppLanguage
): string {
  const headings =
    language === "hi"
      ? "👉 यह क्या है: / 👉 यह कैसे काम करता है: / 👉 उदाहरण: / 👉 जल्दी जाँच:"
      : "👉 What is it: / 👉 How does it work: / 👉 Example: / 👉 Quick check:";

  const langNote =
    language === "hi"
      ? "Write the entire answer in Hindi (Devanagari), except numbers and fraction symbols as usual."
      : "Write in clear English for a child.";

  return `You are a patient school math teacher. ${langNote} The student is ${childAge} years old.

Question: ${question}

The answer below failed quality checks (structure, numbered steps, or missing work for fractions).

PREVIOUS ANSWER (too weak — do not copy blindly):
${priorAnswer}

Write a COMPLETE new answer from scratch.

Requirements:
- Use exactly these four section headings in order, each on its own line: ${headings}
- For fraction addition or subtraction: at least 6 numbered steps. Explain why different bottom numbers block adding. Show how we pick a common bottom number (both tables or skip counts). For EACH fraction rewrite: first write "old bottom × ? = new bottom" and name the multiplier (e.g. 2 × 3 = 6, so multiply top and bottom by 3), then show top × same number. Then show equivalent fractions with = (e.g. 1/2 = 3/6 and 1/3 = 2/6). Never say only "multiply top and bottom" without saying by what number and why. Before adding tops, write the problem again as **two fractions with a + or − between them** (e.g. 3/6 + 2/6) and say **both bottoms are the same so now we can add**. Then add tops and keep the bottom. Use plain fraction notation (no backticks).
- Example section should match the same numbers or a matching story (slices = denominator).
- Quick check: exactly one short question; do not answer it.`;
}
