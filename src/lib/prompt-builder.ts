import { readFileSync } from "fs";
import { join } from "path";
import { detectSubject } from "./subject-detection";
import { isMathQuestion } from "./math-question-detection";
import {
  detectMathTopic,
  detectWholeOpsFlavor,
  type MathTopic,
} from "./math-topic";
import type { AppLanguage } from "./answer-language";

const PROMPTS_DIR = join(process.cwd(), "prompts");

let cachedMasterPrompt: string | null = null;

// keyed by "${lang}-${ageBand}" so each age band gets the right headings
const languageFragmentCache = new Map<string, string>();

const promptFileCache = new Map<string, string>();

function readPromptFile(relativePath: string): string {
  if (!promptFileCache.has(relativePath)) {
    const text = readFileSync(join(PROMPTS_DIR, relativePath), "utf-8").trim();
    promptFileCache.set(relativePath, text);
  }
  return promptFileCache.get(relativePath)!;
}

const TOPIC_TO_MATH_FRAGMENT: Record<MathTopic, string> = {
  fractions_add_sub: "math/math-fractions-add-sub.txt",
  whole_ops: "math/math-whole-ops.txt",
  word_problem: "math/math-word-problems.txt",
  general: "math/math-general.txt",
};

function fewShotRelativePath(
  topic: MathTopic,
  lang: AppLanguage,
  question: string
): string {
  if (topic === "fractions_add_sub") {
    return lang === "hi"
      ? "examples/fraction-add-hi.txt"
      : "examples/fraction-add-en.txt";
  }
  if (topic === "word_problem") {
    return "examples/word-problem-en.txt";
  }
  if (topic === "whole_ops") {
    const flavor = detectWholeOpsFlavor(question);
    const map: Record<string, string> = {
      addition: "examples/addition-carry-en.txt",
      subtraction: "examples/subtraction-borrow-en.txt",
      multiplication: "examples/multiplication-groups-en.txt",
      division: "examples/division-sharing-en.txt",
    };
    return map[flavor];
  }
  return "examples/addition-carry-en.txt";
}

function buildMathTeachingRulesBlock(
  question: string,
  childAge: number,
  language: AppLanguage
): string {
  if (!isMathQuestion(question)) return "";

  const topic = detectMathTopic(question);
  const langLabel = language === "hi" ? "Hindi (Devanagari)" : "English";

  const base = readPromptFile("math/math-base.txt");
  const topicBody = readPromptFile(TOPIC_TO_MATH_FRAGMENT[topic]);
  const fewShotPath = fewShotRelativePath(topic, language, question);
  const fewShot = readPromptFile(fewShotPath);

  const body = [base, topicBody, fewShot].join("\n\n");

  return `\n${body
    .replace(/\{child_age\}/g, String(childAge))
    .replace(/\{language\}/g, langLabel)}\n`;
}

function getMasterPrompt(): string {
  if (cachedMasterPrompt) return cachedMasterPrompt;
  cachedMasterPrompt = readFileSync(
    join(PROMPTS_DIR, "master-prompt.txt"),
    "utf-8"
  );
  return cachedMasterPrompt;
}

export function getAgeBand(age: number): string {
  if (age <= 7)  return "6-7";
  if (age <= 9)  return "8-9";
  if (age <= 11) return "10-11";
  return "12-15";
}

function getLanguageInstructions(lang: AppLanguage, ageBand: string): string {
  const cacheKey = `${lang}-${ageBand}`;
  if (languageFragmentCache.has(cacheKey)) return languageFragmentCache.get(cacheKey)!;

  // Age 6-7 gets a special story-framing file; all older ages use the standard file
  const isYoung = ageBand === "6-7";
  const fileName = lang === "en"
    ? (isYoung ? "language-en-young.txt" : "language-en.txt")
    : (isYoung ? "language-hi-young.txt" : "language-hi.txt");

  const text = readFileSync(join(PROMPTS_DIR, fileName), "utf-8").trim();
  languageFragmentCache.set(cacheKey, text);
  return text;
}

/** Strip template-placeholder syntax from user-supplied text to prevent prompt corruption. */
function sanitizeUserInput(text: string): string {
  return text.replace(/\{[^}]{0,40}\}/g, "");
}

export function buildPrompt(
  question: string,
  childAge: number,
  language: AppLanguage = "en"
): string {
  const subject = detectSubject(question);
  const ageBand = getAgeBand(childAge);
  const masterPrompt = getMasterPrompt();
  const languageInstructions = getLanguageInstructions(language, ageBand);
  const mathTeachingRules = buildMathTeachingRulesBlock(question, childAge, language);
  const safeQuestion = sanitizeUserInput(question);

  return masterPrompt
    .replace(/\{language_instructions\}/g, languageInstructions)
    .replace(/\{math_teaching_rules\}/g, mathTeachingRules)
    .replace(/\{user_question\}/g, safeQuestion)
    .replace(/\{detected_subject\}/g, subject)
    .replace(/\{child_age\}/g, String(childAge));
}

/**
 * Returns the system prompt (everything except the final Question/Subject/Age lines)
 * and the user message (just the question line), for use with the system role.
 */
export function buildSystemPrompt(
  question: string,
  childAge: number,
  language: AppLanguage = "en"
): { systemPrompt: string; userMessage: string } {
  const subject = detectSubject(question);
  const ageBand = getAgeBand(childAge);
  const masterPrompt = getMasterPrompt();
  const languageInstructions = getLanguageInstructions(language, ageBand);
  const mathTeachingRules = buildMathTeachingRulesBlock(question, childAge, language);
  const safeQuestion = sanitizeUserInput(question);

  const filled = masterPrompt
    .replace(/\{language_instructions\}/g, languageInstructions)
    .replace(/\{math_teaching_rules\}/g, mathTeachingRules)
    .replace(/\{detected_subject\}/g, subject)
    .replace(/\{child_age\}/g, String(childAge));

  // Split out the final "Question: ..." line so it becomes the user turn.
  // Everything before it is the system prompt.
  const questionLineRegex = /\nQuestion:\s*\{user_question\}\s*\n?/;
  const parts = filled.split(questionLineRegex);
  if (parts.length === 2) {
    return {
      systemPrompt: parts[0]!.trim(),
      userMessage: safeQuestion,
    };
  }

  // Fallback: treat the whole filled prompt as system and question as user
  return {
    systemPrompt: filled.replace(/\{user_question\}/g, "").trim(),
    userMessage: safeQuestion,
  };
}
