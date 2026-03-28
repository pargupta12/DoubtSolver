import type { NextApiRequest, NextApiResponse } from "next";
import { Ollama } from "ollama";
import { buildPrompt, buildSystemPrompt, getAgeBand } from "@/lib/prompt-builder";
import { hasInappropriateContent } from "@/lib/content-safety";
import { get as getCached, set as setCached } from "@/lib/response-cache";
import { validateResponse } from "@/lib/validation";
import {
  getSafeResponse,
  isAppLanguage,
  parseLanguage,
  type AppLanguage,
} from "@/lib/answer-language";
import { isMathQuestion } from "@/lib/math-question-detection";
import {
  buildMathRegenerationUserPrompt,
  mathAnswerFailsGuard,
} from "@/lib/math-answer-guard";
import { detectSubject } from "@/lib/subject-detection";

const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "gemini-3-flash-preview";
const OLLAMA_TIMEOUT_MS = 30_000;

const RETRYABLE_ERRORS = [
  "500", "502", "503", "Internal Server Error",
  "ECONNRESET", "ETIMEDOUT", "ECONNREFUSED", "fetch failed", "network",
];

function getOllamaClient() {
  const apiKey = process.env.OLLAMA_API_KEY;
  if (!apiKey) {
    throw new Error("OLLAMA_API_KEY is not configured");
  }
  return new Ollama({
    host: "https://ollama.com",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

function isRetryableError(err: unknown): boolean {
  const msg = String(err);
  return RETRYABLE_ERRORS.some((token) => msg.includes(token));
}

async function chatWithTimeout(
  ollama: Ollama,
  messages: Array<{ role: string; content: string }>,
  stream: true
): Promise<AsyncIterable<{ message?: { content?: string } }>>;
async function chatWithTimeout(
  ollama: Ollama,
  messages: Array<{ role: string; content: string }>,
  stream: false
): Promise<{ message?: { content?: string } }>;
async function chatWithTimeout(
  ollama: Ollama,
  messages: Array<{ role: string; content: string }>,
  stream: boolean
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await (ollama.chat as any)({
      model: OLLAMA_MODEL,
      messages,
      stream,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      question,
      age = 10,
      language: languageRaw,
      priorQuestion,
      priorAnswer,
      quickCheckAnswer,
      originalAnswer,
      conversationHistory: rawConversationHistory,
    } = req.body;

    if (!question || typeof question !== "string") {
      return res.status(400).json({ error: "Question is required" });
    }
    if (question.trim().length > 500) {
      return res.status(400).json({ error: "Question is too long (max 500 characters)" });
    }

    if (languageRaw !== undefined && !isAppLanguage(languageRaw)) {
      return res.status(400).json({ error: 'Invalid language. Use "en" or "hi".' });
    }

    const language: AppLanguage = parseLanguage(languageRaw);
    const safeText = getSafeResponse(language);

    const trimmedQuestion = question.trim();
    const childAge = Math.min(Math.max(Number(age) || 10, 5), 15);
    const subject = detectSubject(trimmedQuestion);

    if (hasInappropriateContent(trimmedQuestion)) {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      return res.status(400).send(safeText);
    }

    // ── Quick-check verification ─────────────────────────────────────────────
    if (quickCheckAnswer && typeof quickCheckAnswer === "string" && originalAnswer) {
      const langNote = language === "hi"
        ? "Reply in simple Hindi (Devanagari)."
        : "Reply in simple English.";
      const checkPrompt = `You are checking a ${childAge}-year-old's answer to a school question. ${langNote}

Original question: ${trimmedQuestion}
What was explained to the child:
${originalAnswer}

The child's answer to the Quick check question: "${quickCheckAnswer.trim()}"

Reply with 1–2 short sentences only:
- If correct or mostly correct: start with "${language === "hi" ? "बहुत अच्छा! 🎉" : "That's right! 🎉"}" and add one warm encouraging line.
- If not quite right: start with "${language === "hi" ? "लगभग सही —" : "Not quite —"}" and give a gentle hint without giving away the full answer.
Keep it very simple and encouraging.`;

      const ollama = getOllamaClient();
      const result = await chatWithTimeout(ollama, [{ role: "user", content: checkPrompt }], false) as { message?: { content?: string } };
      const feedback = result.message?.content?.trim() ?? (language === "hi" ? "अच्छी कोशिश!" : "Good try!");
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      return res.send(feedback);
    }

    // ── Cache lookup (skip for follow-up / explain-differently requests) ─────
    const isFollowUp = typeof priorQuestion === "string" && typeof priorAnswer === "string";

    if (!isFollowUp) {
      const cached = getCached(trimmedQuestion, childAge, language);
      if (cached) {
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.setHeader("X-Detected-Subject", subject);
        return res.send(cached);
      }
    }

    const { systemPrompt, userMessage } = buildSystemPrompt(trimmedQuestion, childAge, language);
    const ollama = getOllamaClient();
    const isMath = isMathQuestion(trimmedQuestion);

    // Build messages — include prior context for "explain differently" requests
    // or conversation history for multi-turn follow-ups
    const conversationHistory = Array.isArray(rawConversationHistory) ? rawConversationHistory as Array<{ role: string; content: string }> : null;

    let baseMessages: Array<{ role: string; content: string }>;
    if (isFollowUp) {
      baseMessages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: priorQuestion as string },
        { role: "assistant", content: priorAnswer as string },
        { role: "user", content: language === "hi"
          ? "मैं पिछली बात नहीं समझा। कृपया इसे बिल्कुल अलग तरीके से और एक नए उदाहरण के साथ समझाओ।"
          : "I didn't understand that. Please explain it again with a completely different approach and a new example." },
      ];
    } else if (conversationHistory && conversationHistory.length > 0) {
      // Multi-turn conversation: include prior turns as context
      baseMessages = [
        { role: "system", content: systemPrompt },
        ...conversationHistory.slice(-8), // Max 4 turn pairs to stay within token limits
        { role: "user", content: userMessage },
      ];
    } else {
      baseMessages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ];
    }

    const maxAttempts = 2;
    let fullText = "";

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const stream = await chatWithTimeout(
          ollama,
          baseMessages,
          true
        ) as AsyncIterable<{ message?: { content?: string } }>;

        fullText = "";
        for await (const part of stream) {
          const text = part.message?.content ?? "";
          if (text) fullText += text;
        }
        break;
      } catch (ollamaErr) {
        if (attempt < maxAttempts && isRetryableError(ollamaErr)) {
          await new Promise((r) => setTimeout(r, 1000 * attempt));
        } else {
          throw ollamaErr;
        }
      }
    }

    if (hasInappropriateContent(fullText)) {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      return res.send(safeText);
    }

    if (mathAnswerFailsGuard(trimmedQuestion, fullText)) {
      try {
        const regenUser = buildMathRegenerationUserPrompt(
          trimmedQuestion,
          fullText,
          childAge,
          language
        );
        const regenSystem = language === "hi"
          ? `तुम एक धैर्यशील गणित शिक्षक हो। छात्र की उम्र ${childAge} साल है। पूरा जवाब सरल हिंदी देवनागरी में दो। वाक्य छोटे और आसान रखो।`
          : `You are a patient school math teacher explaining to a ${childAge}-year-old child. Use simple words and short sentences appropriate for their age.`;
        const regen = await chatWithTimeout(
          ollama,
          [
            { role: "system", content: regenSystem },
            { role: "user", content: regenUser },
          ],
          false
        ) as { message?: { content?: string } };
        const fixed = regen.message?.content?.trim();
        if (fixed && fixed.length > 80 && !hasInappropriateContent(fixed)) {
          fullText = fixed;
        }
      } catch {
        // keep original answer
      }
    }

    const ageBand = getAgeBand(childAge);

    // Sentence-length check applies to both languages.
    // FK readability and jargon checks are English-only (return neutral values for Hindi).
    const { jargon, readabilityFails, sentenceLengthFails } = validateResponse(fullText, ageBand, isMath);
    const needsSimplify =
      jargon.length > 0 ||
      (language === "en" && readabilityFails) ||
      sentenceLengthFails;

    if (needsSimplify) {
      let simplifyPrompt: string;

      if (language === "hi") {
        const headings = "👉 यह क्या है: / 👉 यह कैसे काम करता है: / 👉 उदाहरण: / 👉 जल्दी जाँच:";
        const sentenceNote = sentenceLengthFails
          ? ` हर वाक्य ${ageBand === "6-9" ? "12" : "15"} शब्दों से कम रखो।`
          : "";
        simplifyPrompt = `इस जवाब को ${childAge} साल के बच्चे के लिए सरल हिंदी में दोबारा लिखो।${sentenceNote} यही शीर्षक रखो: ${headings}.

पुराना जवाब: ${fullText}`;
      } else {
        {
          // English simplification for all age bands
          const headings = "👉 What is it: / 👉 How does it work: / 👉 Example: / 👉 Quick check:";
          const mathNote = isMath
            ? " Keep all numbered math steps and equivalent fractions (e.g. 1/2 = 3/6); do not drop intermediate work."
            : "";
          const sentenceNote = sentenceLengthFails
            ? ` Every sentence must be ${ageBand === "6-9" ? "12" : "15"} words or fewer.`
            : "";
          simplifyPrompt = `Rewrite this answer for a ${childAge}-year-old.${
            jargon.length > 0 ? ` Replace these words with simpler ones: ${jargon.join(", ")}.` : ""
          }${sentenceNote} Keep the same meaning and the exact headings: ${headings}.${mathNote}

Original: ${fullText}`;
        }
      }

      try {
        const retryResult = await chatWithTimeout(
          ollama,
          [{ role: "user", content: simplifyPrompt }],
          false
        ) as { message?: { content?: string } };
        const simplified = retryResult.message?.content?.trim();
        if (simplified && simplified.length > 20) {
          fullText = simplified;
        }
      } catch {
        // keep original
      }
    }

    // Only cache original questions, not follow-up "explain differently" calls
    if (!isFollowUp) {
      setCached(trimmedQuestion, childAge, language, fullText);
    }

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("X-Detected-Subject", subject);
    return res.send(fullText);
  } catch (err) {
    console.error("Chat API error:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to get answer",
    });
  }
}
