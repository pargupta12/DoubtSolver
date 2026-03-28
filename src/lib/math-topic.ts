/**
 * Finer routing inside math questions for topic-specific prompts and few-shots.
 *
 * Topics (in detection priority order):
 *   geometry           — shapes, area, perimeter, volume, angles
 *   measurement        — length, weight, capacity, time, money, speed
 *   percentage         — percent, discount, profit/loss
 *   decimals           — decimal operations, decimal ↔ fraction conversion
 *   fractions_concepts — what is a fraction, compare, multiply, divide fractions
 *   fractions_add_sub  — adding/subtracting fractions with unlike denominators
 *   patterns           — sequences, LCM, HCF, factors, multiples, prime
 *   place_value        — place value, expanded form, Indian/international system
 *   word_problem       — story problems with numbers
 *   whole_ops          — plain arithmetic: 28+15, 52-18, 3×4, 12÷3
 *   general            — everything else
 */

export type MathTopic =
  | "fractions_add_sub"
  | "fractions_concepts"
  | "whole_ops"
  | "word_problem"
  | "geometry"
  | "measurement"
  | "decimals"
  | "percentage"
  | "patterns"
  | "place_value"
  | "general";

// ── Keyword patterns ────────────────────────────────────────────────────────

const GEOMETRY_HINTS =
  /\b(perimeter|area|volume|surface area|triangle|rectangle|square|circle|cube|cuboid|cylinder|cone|sphere|angle|acute|obtuse|right angle|parallel|perpendicular|diagonal|radius|diameter|circumference|polygon|hexagon|pentagon|symmetry|congruent|similar|shape)\b/i;

const MEASUREMENT_HINTS =
  /\b(cm\b|mm\b|km\b|meter|metre|kg\b|gram|litre|liter|mL\b|gallon|inch|feet|foot|mile|speed|distance|time taken|hours? and minutes?|minutes? and seconds?|clock|am\b|pm\b|weight|weigh|capacity|temperature|celsius|fahrenheit|conversion|convert|₹|rupee|paise|money|change|bill)\b/i;

const PERCENTAGE_HINTS =
  /\b(percent|percentage|%|discount|profit|loss|marked price|selling price|cost price|increase by|decrease by|interest|rate)\b/i;

const DECIMAL_HINTS =
  /\b(decimal|tenths?|hundredths?|thousandths?|point|0\.\d|place value of .* decimal)\b/i;

const FRACTION_CONCEPT_HINTS =
  /\b(equivalent fraction|simplify.*fraction|reduce.*fraction|compare.*fraction|order.*fraction|improper fraction|mixed number|reciprocal|multiply.*fraction|divide.*fraction|fraction.*multiply|fraction.*divide|of\s+\d+\/\d+|what is a fraction|what fraction|numerator|denominator)\b/i;

const PATTERN_HINTS =
  /\b(pattern|sequence|next number|what comes next|factor|multiple|prime number|composite|lcm|hcf|gcd|gcf|divisibility|even number|odd number|square number|triangular number|common factor|common multiple|prime factori[sz]ation)\b/i;

const PLACE_VALUE_HINTS =
  /\b(place value|face value|expanded form|standard form|ones|tens|hundreds|thousands|lakhs?|crores?|predecessor|successor|ascending order|descending order|number name|number in words|numeral|indian system|international system|rounding|round off|number system)\b/i;

const WORD_PROBLEM_HINTS =
  /\b(how many|each has|each get|left over|altogether|in all|more than|less than|per day|per hour|shared equally|split equally|remaining|bought|sold|costs?|rupees?|dollars?|apples?|oranges?|slices?|meters?|metres?|liters?|litres?)\b/i;

// ── Main detector ───────────────────────────────────────────────────────────

export function detectMathTopic(question: string): MathTopic {
  const q = question.trim();
  const lower = q.toLowerCase();

  // ── 1. Geometry (high priority — very distinctive keywords) ───────────
  if (GEOMETRY_HINTS.test(lower)) return "geometry";

  // ── 2. Percentage (before decimals — "25% of 200" should not be decimal) ─
  if (PERCENTAGE_HINTS.test(lower)) return "percentage";

  // ── 3. Measurement (before word problems — "5 km" is measurement, not generic word problem)
  if (MEASUREMENT_HINTS.test(lower) && /\d/.test(q)) return "measurement";

  // ── 4. Decimal questions ──────────────────────────────────────────────
  if (DECIMAL_HINTS.test(lower)) return "decimals";
  // Decimal arithmetic: 3.25 + 1.7
  if (/\d+\.\d+\s*[\+\-\*×÷]\s*\d+\.?\d*/.test(q) && !/\d+\/\d+/.test(q)) return "decimals";

  // ── 5. Fraction add/sub (like before — specific patterns) ─────────────
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

  // ── 6. Fraction concepts (multiply, divide, compare, equivalent) ──────
  if (FRACTION_CONCEPT_HINTS.test(lower)) return "fractions_concepts";
  // Single fraction present + conceptual words
  if (fracCount >= 1 && /\b(multiply|divide|compare|simplify|reduce|equivalent|of)\b/i.test(lower)) {
    return "fractions_concepts";
  }

  // ── 7. Patterns, LCM, HCF, factors, primes ───────────────────────────
  if (PATTERN_HINTS.test(lower)) return "patterns";

  // ── 8. Place value ────────────────────────────────────────────────────
  if (PLACE_VALUE_HINTS.test(lower)) return "place_value";

  // ── 9. Word problems ─────────────────────────────────────────────────
  if (
    WORD_PROBLEM_HINTS.test(q) &&
    /[a-zA-Z]{4,}/.test(q) &&
    /\d/.test(q) &&
    !/^\s*\d+\s*[\+\-\*×÷]\s*\d+\s*$/.test(q)
  ) {
    return "word_problem";
  }

  // ── 10. Whole-number arithmetic ───────────────────────────────────────
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
