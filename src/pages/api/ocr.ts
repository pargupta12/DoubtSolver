import type { NextApiRequest, NextApiResponse } from "next";

/**
 * POST /api/ocr
 *
 * Accepts a base64-encoded image of a textbook page / handwritten question.
 * Sends it to Gemini Vision (via Ollama-compatible endpoint) to extract the
 * question text, then returns the plain-text question for the client to
 * feed into the existing /api/chat pipeline.
 *
 * Body: { image: string }   – base64 data URI (e.g. "data:image/jpeg;base64,...")
 * Response: { question: string } on success, { error: string } on failure.
 */

const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "gemini-3-flash-preview";

function getOllamaClient() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Ollama } = require("ollama") as typeof import("ollama");
  const apiKey = process.env.OLLAMA_API_KEY;
  if (!apiKey) throw new Error("OLLAMA_API_KEY is not configured");
  return new Ollama({
    host: "https://ollama.com",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb", // textbook photos can be large
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { image } = req.body;
  if (!image || typeof image !== "string") {
    return res.status(400).json({ error: "image (base64 data URI) is required" });
  }

  // Strip the data URI prefix → pure base64
  const base64Match = image.match(/^data:image\/\w+;base64,(.+)$/);
  if (!base64Match) {
    return res.status(400).json({ error: "Invalid image format. Expected base64 data URI." });
  }
  const base64Data = base64Match[1]!;

  try {
    const ollama = getOllamaClient();

    const result = await ollama.chat({
      model: OLLAMA_MODEL,
      messages: [
        {
          role: "user",
          content: "Look at this image of a textbook or notebook page. Extract ONLY the question or problem visible in the image. Return ONLY the extracted question text — nothing else. If there are multiple questions, extract the most prominent one. If the image contains Hindi (Devanagari), preserve the Hindi text. If you cannot find a clear question, reply with: NO_QUESTION_FOUND",
          images: [base64Data],
        },
      ],
    });

    const extracted = result.message?.content?.trim() ?? "";

    if (!extracted || extracted === "NO_QUESTION_FOUND") {
      return res.status(400).json({
        error: "Could not find a clear question in the image. Try taking a clearer photo.",
      });
    }

    // Clean up any preamble the model may have added
    const cleaned = extracted
      .replace(/^(the question is|question:|extracted question:|here is the question)\s*:?\s*/i, "")
      .trim();

    return res.json({ question: cleaned });
  } catch (err) {
    console.error("OCR API error:", err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to process image",
    });
  }
}
