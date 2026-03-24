import { readFileSync } from "fs";
import { join } from "path";

let CONTENT_BLOCKLIST: string[] | null = null;

function loadBlocklist(): string[] {
  if (CONTENT_BLOCKLIST) return CONTENT_BLOCKLIST;
  try {
    const content = readFileSync(
      join(process.cwd(), "prompts", "content-blocklist.txt"),
      "utf-8"
    );
    CONTENT_BLOCKLIST = content
      .split("\n")
      .map((line) => line.split("#")[0].trim().toLowerCase())
      .filter((w) => w.length > 2);
    return CONTENT_BLOCKLIST;
  } catch {
    CONTENT_BLOCKLIST = [];
    return CONTENT_BLOCKLIST;
  }
}

const FALLBACK_TERMS = [
  "sex", "nude", "naked", "porn", "xxx", "erotic", "adult content",
  "kill yourself", "suicide", "how to die"
];

export function hasInappropriateContent(text: string): boolean {
  const blocklist = loadBlocklist();
  const terms = blocklist.length > 0 ? blocklist : FALLBACK_TERMS;
  const lower = text.toLowerCase();
  return terms.some((term) => lower.includes(term));
}
