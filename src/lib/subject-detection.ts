import { isMathQuestion } from "./math-question-detection";

const SUBJECT_KEYWORDS: Record<string, string[]> = {
  science: [
    "photosynthesis", "gravity", "light", "plant", "animal", "atom",
    "science", "nature", "biology", "physics", "chemistry", "cell",
    "magnet", "electricity", "force", "energy", "molecule", "experiment",
    "sun", "moon", "star", "rotate", "orbit", "solar", "eclipse", "space",
    "galaxy", "universe", "planet", "mars", "venus", "spin",
    "heart", "digest", "brain", "blood", "bone", "muscle", "organ",
    "water", "air", "grow", "seed", "leaf", "root", "flower",
    "sound", "wave", "vibration", "heat", "cold", "temperature",
    "metal", "gas", "liquid", "solid", "oxygen", "carbon"
  ],
  history: [
    "history", "war", "king", "queen", "ancient", "century", "battle",
    "empire", "civilization", "independence", "freedom", "revolution",
    "dynasty", "medieval", "colonization", "freedom fighter",
    "leader", "ruler", "emperor", "soldier", "explorer", "discovery",
    "invention", "trade", "kingdom", "temple", "monument",
    "past", "ago", "founding", "independence day"
  ],
  geography: [
    "country", "map", "continent", "mountain", "river", "ocean", "capital",
    "geography", "earth", "world", "climate", "weather",
    "latitude", "longitude", "globe", "desert", "forest", "island",
    "city", "village", "town", "state", "region", "volcano", "valley",
    "lake", "sea", "bay", "population", "border", "language",
    "currency", "flag", "capital city"
  ],
  english: [
    "grammar", "sentence", "verb", "noun", "adjective", "pronoun",
    "comma", "period", "paragraph", "spell", "meaning", "synonym",
    "tense", "plural", "singular", "essay", "story", "poem",
    "adverb", "preposition", "conjunction", "article", "phrase",
    "write", "writing", "letter", "word", "book", "rhyme",
    "capital letter", "punctuation", "question mark", "exclamation"
  ],
  technology: [
    "internet", "computer", "phone", "app", "software", "code",
    "robot", "ai", "digital", "website", "email", "wifi", "programming",
    "battery", "screen", "data", "cloud", "video", "game",
    "search", "online", "download", "upload", "device",
    "machine", "camera", "television", "tv"
  ],
  environment: [
    "pollution", "recycle", "climate", "global warming", "plastic",
    "environment", "earth day", "save", "tree", "waste",
    "green", "eco", "planet", "conservation",
    "wildlife", "endangered", "extinct", "habitat", "ecosystem",
    "ocean", "forest", "rainforest", "ozone", "carbon",
    "sustainable", "renewable", "solar panel", "wind energy"
  ]
};

export function detectSubject(question: string): string {
  if (isMathQuestion(question)) return "math";

  const lower = question.toLowerCase().trim();
  let bestMatch = "general";
  let maxScore = 0;

  for (const [subject, keywords] of Object.entries(SUBJECT_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) score++;
    }
    if (score > maxScore) {
      maxScore = score;
      bestMatch = subject;
    }
  }
  return bestMatch;
}
