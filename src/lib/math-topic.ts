/**
 * Finer routing inside math questions for topic-specific prompts and few-shots.
 */

export type MathTopic =
  | "fractions_add_sub"
  | "whole_ops"
  | "word_problem"
  | "general";

const WORD_PROBLEM_HINTS =
  /\b(how many|each has|each get|left over|altogether|in all|more than|less than|per day|per hour|shared equally|split equally|remaining|bought|sold|costs?|rupees?|dollars?|apples?|oranges?|slices?|meters?|metres?|liters?|litres?)\b/i;

export function detectMathTopic(question: string): MathTopic {
  const q = question.trim();
  const lower = q.toLowerCase();

  if (
    /\d+\/\d+\s*[\+\-]\s*\d+\/\d+/.test(q) ||
    /\d+\s*\/\s*\d+\s*[\+\-]\s*\d+\s*\/\s*\d+/.test(q)
  ) {
    return "fractions_add_sub";
  }

  const fracCount = (q.match(/\d+\/\d+/g) ?? []).length;
  if (fracCount >= 1 && /\b(plus|minus|add|subtract|and)\b/i.test(lower)) {
    if (fracCount >= 2 || /\b(half|third|quarter|fourth|fifth)\b/i.test(lower)) {
      return "fractions_add_sub";
    }
  }

  if (
    WORD_PROBLEM_HINTS.test(q) &&
    /[a-zA-Z]{4,}/.test(q) &&
    /\d/.test(q) &&
    !/^\s*\d+\s*[\+\-\*×÷]\s*\d+\s*$/.test(q)
  ) {
    return "word_problem";
  }

  if (!/\d+\/\d+/.test(q)) {
    if (/\d+\s*[\+\-\*×÷]\s*\d+/.test(q)) return "whole_ops";
    if (/\([^)]*\d[^)]*\)/.test(q) && /[\+\-\*×÷]/.test(q)) return "whole_ops";
  }

  return "general";
}

/** Which whole-number few-shot example to attach. */
export type WholeOpsFlavor = "addition" | "subtraction" | "multiplication" | "division";

export function detectWholeOpsFlavor(question: string): WholeOpsFlavor {
  const lower = question.toLowerCase();
  if (/\b(divide|divided|division|÷|shared|share equally|split)\b/i.test(lower) || /÷/.test(question))
    return "division";
  if (/\b(times|multiply|×|\*)\b/i.test(lower) || /×/.test(question)) return "multiplication";
  if (
    /\b(minus|subtract|take away|less)\b/i.test(lower) ||
    /\d\s*[-−]\s*\d/.test(question)
  )
    return "subtraction";
  return "addition";
}
