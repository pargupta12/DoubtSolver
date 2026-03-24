/**
 * Heuristic detection of school-style math questions (fractions, operations, word problems).
 * False positives (e.g. dates) are reduced with simple guards.
 */

const MATH_PHRASES =
  /\b(plus|minus|times|multiply|multiplied|divide|divided|add|added|subtract|subtracted|fraction|fractions|half|halves|third|thirds|quarter|quarters|equals|equal to|what is|how much|how many|lcm|gcd|hcf|gcf|percent|percentage|perimeter|area of|volume of|solve|equation|algebra|numerator|denominator|square root|decimal|ratio|proportion|word problem|pemdas|bodmas)\b/i;

const MATH_WORD_PROBLEM =
  /\b(how many (more|less|left|altogether|in all)|cost(s)?|buy(s|ing)?|apples?|oranges?|slices?|pizzas?|cake|meters?|metres?|cm\b|km\b|kg\b|liters?|litres?|rupees?|dollars?)\b/i;

/** Looks like a calendar date (avoid treating as fraction math). */
function looksLikeDateOnly(text: string): boolean {
  const t = text.trim();
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(t)) return true;
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(t)) return true;
  return false;
}

export function isMathQuestion(question: string): boolean {
  const q = question.trim();
  if (!q) return false;
  const lower = q.toLowerCase();
  if (looksLikeDateOnly(q)) return false;

  // digit (op) digit — strong signal
  if (/\d+\s*[\+\-\*×÷]\s*\d+/.test(q)) return true;
  if (/\d+\s*=\s*\?/.test(q) || /\?\s*=\s*\d+/.test(q)) return true;

  // Fraction ± fraction (with optional spaces around /)
  if (/\d+\/\d+\s*[\+\-]\s*\d+\/\d+/.test(q)) return true;
  if (/\d+\s*\/\s*\d+\s*[\+\-]\s*\d+\s*\/\s*\d+/.test(q)) return true;

  // Parentheses with arithmetic
  if (/\([^)]*\d[^)]*\)/.test(q) && /[\+\-\*×÷]/.test(q)) return true;

  // Decimal arithmetic hints
  if (/\d+\.\d+/.test(q) && (MATH_PHRASES.test(q) || /[\+\-\*×÷]/.test(q))) return true;

  // Subscript-style exponents x^2 (simple)
  if (/\d+\s*\^\s*\d+/.test(q) || /[a-z]\s*\^\s*\d+/i.test(q)) return true;

  // "what is" / "find" + math-looking expression (avoid "what is chapter 1 about")
  if (/\b(what is|find|calculate|compute|evaluate)\b/i.test(lower) && /\d/.test(q)) {
    if (
      /[\+\-\*×÷\^]/.test(q) ||
      /\d+\/\d+/.test(q) ||
      /\b(plus|minus|times|divided by|multiplied by|multiply|divide)\b/i.test(lower)
    ) {
      return true;
    }
  }

  // Fractions: require math context OR multiple fraction tokens OR not a date-like triple slash
  const fractionToken = /\d+\/\d+/g;
  const fractions = q.match(fractionToken);
  if (fractions && fractions.length > 0) {
    const hasDateMiddle =
      /\d{1,2}\/\d{1,2}\/\d{2,4}/.test(q) && !/[\+\*×]/.test(q) && fractions.length < 2;
    if (hasDateMiddle && !MATH_PHRASES.test(q)) {
      // e.g. "birthday 1/2/2010" — skip unless explicit math words
      return false;
    }
    if (fractions.length >= 2) return true;
    if (MATH_PHRASES.test(q)) return true;
    if (MATH_WORD_PROBLEM.test(q) && /\d/.test(q)) return true;
  }

  // Keyword + digit (word problems, geometry labels, etc.)
  if (/\d/.test(q)) {
    if (
      /\b(lcm|gcd|hcf|gcf|percent|percentage|area of|perimeter of|volume of|solve for|equation)\b/i.test(
        lower
      )
    ) {
      return true;
    }
    if (MATH_WORD_PROBLEM.test(q) && (MATH_PHRASES.test(q) || /[\+\-\*×÷]/.test(q))) {
      return true;
    }
  }

  return false;
}
