import { isMathQuestion } from "./math-question-detection";

const SUBJECT_KEYWORDS: Record<string, string[]> = {
  science: [
    // Physics
    "gravity", "force", "motion", "friction", "speed", "velocity", "acceleration",
    "light", "sound", "wave", "vibration", "heat", "temperature", "cold",
    "electricity", "magnet", "magnetism", "conductor", "insulator",
    "pressure", "density", "buoyancy", "float", "sink",
    // Chemistry
    "atom", "molecule", "element", "compound", "mixture", "reaction",
    "acid", "base", "chemical", "oxygen", "carbon", "hydrogen", "nitrogen",
    "metal", "gas", "liquid", "solid", "evaporate", "condense", "dissolve",
    "boil", "freeze", "melt", "rust",
    // Biology / Body
    "photosynthesis", "cell", "dna", "gene", "bacteria", "virus", "microbe",
    "heart", "digest", "brain", "blood", "bone", "muscle", "organ", "nerve",
    "lung", "kidney", "liver", "skin", "immune", "protein", "enzyme",
    // Plants and Nature
    "plant", "animal", "seed", "leaf", "root", "flower", "fruit", "grow",
    "ecosystem", "food chain", "predator", "prey", "habitat",
    // Space
    "sun", "moon", "star", "planet", "mars", "venus", "jupiter", "saturn",
    "orbit", "rotate", "solar system", "galaxy", "universe", "space",
    "eclipse", "asteroid", "comet", "black hole", "light year",
    // General science
    "science", "biology", "physics", "chemistry", "nature", "experiment",
    "water", "air", "weather", "cloud", "rain", "snow",
  ],

  history: [
    // Indian history
    "gandhi", "nehru", "ambedkar", "bose", "bhagat singh", "patel",
    "mughal", "ashoka", "akbar", "aurangzeb", "shah jahan", "babur",
    "maratha", "maurya", "gupta", "chola", "vijayanagara",
    "independence", "partition", "british raj", "colonial", "east india company",
    "sepoy mutiny", "1857", "salt march", "dandi", "quit india",
    "taj mahal", "red fort", "qutub minar", "harappa", "mohenjo daro",
    "indus valley", "vedic", "ancient india",
    // World history
    "world war", "ww1", "ww2", "holocaust", "cold war", "french revolution",
    "american revolution", "roman empire", "roman", "greek", "egypt",
    "alexander", "napoleon", "hitler", "churchill", "lincoln",
    "slavery", "apartheid", "civil war", "empire", "dynasty",
    // General history
    "history", "ancient", "medieval", "modern", "century", "war", "battle",
    "king", "queen", "emperor", "ruler", "leader", "soldier", "explorer",
    "revolution", "civilization", "monument", "temple", "kingdom",
    "freedom fighter", "colonization", "discovery", "trade route",
    "past", "ago", "founded", "independence day",
  ],

  geography: [
    // Indian geography
    "himalayas", "ganga", "brahmaputra", "indus", "yamuna",
    "western ghats", "eastern ghats", "deccan plateau", "thar desert",
    "andaman", "lakshadweep", "kashmir", "kerala", "rajasthan",
    // World geography
    "amazon", "nile", "sahara", "arctic", "antarctic",
    "amazon rainforest", "everest", "andes", "alps",
    "pacific", "atlantic", "indian ocean", "arctic ocean",
    // General geography
    "country", "map", "continent", "mountain", "river", "ocean", "sea",
    "capital", "geography", "earth", "globe", "world",
    "climate", "latitude", "longitude",
    "desert", "forest", "island", "valley", "volcano", "glacier",
    "city", "village", "state", "region", "border", "population",
    "flag", "capital city", "peninsula", "plateau",
    "monsoon", "rainfall", "coast", "bay",
  ],

  english: [
    "grammar", "sentence", "verb", "noun", "adjective", "pronoun", "adverb",
    "preposition", "conjunction", "article", "interjection",
    "tense", "past tense", "present tense", "future tense",
    "plural", "singular", "possessive",
    "comma", "period", "full stop", "question mark", "exclamation",
    "capital letter", "punctuation", "apostrophe",
    "paragraph", "essay", "story", "poem", "rhyme",
    "spell", "spelling", "meaning", "synonym", "antonym",
    "phrase", "clause", "active voice", "passive voice",
    "write", "writing", "vocabulary", "literature", "comprehension",
  ],

  technology: [
    "internet", "computer", "laptop", "phone", "smartphone",
    "app", "application", "software", "hardware", "operating system",
    "code", "coding", "programming", "algorithm",
    "robot", "robotics", "ai", "artificial intelligence", "machine learning",
    "digital", "website", "email", "wifi", "bluetooth", "network",
    "battery", "screen", "data", "cloud", "server",
    "video game", "gaming", "online", "download", "upload",
    "search engine", "social media",
    "camera", "television", "tv", "satellite",
    "chip", "processor", "cpu", "ram", "storage", "hard drive",
    "password", "cybersecurity", "hacker", "encryption",
    "gps", "navigation", "augmented reality", "virtual reality",
  ],

  environment: [
    "pollution", "air pollution", "water pollution", "noise pollution",
    "recycle", "recycling", "reuse", "reduce", "waste", "plastic",
    "climate change", "global warming", "greenhouse gas", "carbon dioxide",
    "ozone", "ozone layer",
    "deforestation", "tree", "forest", "rainforest",
    "environment", "earth day", "save earth",
    "conservation", "wildlife", "endangered", "extinct", "extinction",
    "habitat", "biodiversity",
    "ocean pollution", "coral reef", "glacier melting", "sea level",
    "renewable energy", "solar panel", "wind energy", "solar power",
    "sustainable", "eco-friendly", "carbon footprint",
  ],

  // ── NEW SUBJECTS ──────────────────────────────────────────────────────────

  gk: [
    "capital of", "capital city of", "largest country", "smallest country",
    "most populated", "national animal", "national bird", "national flower",
    "national flag", "national anthem", "national sport",
    "currency of", "language spoken in",
    "world record", "first in world", "first country",
    "who invented", "who discovered", "who wrote", "who composed",
    "who is the founder", "who created", "who built",
    "general knowledge", "gk", "fun fact",
    "how many countries", "how many continents", "how many oceans",
    "full form", "abbreviation", "stands for",
    "india gate", "gateway of india", "parliament of india", "rashtrapati bhavan",
    "loktak", "chilika", "sundarbans",
    "largest", "smallest", "tallest", "deepest", "longest", "highest",
    "fastest animal", "heaviest animal", "oldest tree",
  ],

  civics: [
    "constitution", "fundamental rights", "fundamental duties",
    "directive principles", "preamble",
    "parliament", "lok sabha", "rajya sabha", "vidhan sabha",
    "prime minister", "president of india", "governor", "chief minister",
    "supreme court", "high court", "judiciary",
    "election", "vote", "voting", "democracy", "democratic",
    "republic", "republic day", "federal", "federalism",
    "panchayat", "local government", "municipality",
    "cabinet", "minister", "law", "act", "bill",
    "rights", "duties", "citizen", "citizenship",
    "constituent assembly", "26 january",
    "separation of powers", "checks and balances",
    "civic", "civics", "social studies",
    "how does government work", "why do we vote", "what is democracy",
  ],

  health: [
    "digestive system", "circulatory system", "respiratory system",
    "nervous system", "skeletal system", "muscular system", "immune system",
    "vitamin", "mineral", "protein", "carbohydrate", "fat", "fibre", "calorie",
    "nutrition", "diet", "healthy food", "junk food", "balanced diet",
    "hygiene", "wash hands", "brush teeth", "germ",
    "infection", "disease", "illness", "sick", "fever", "cold", "flu",
    "vaccine", "vaccination", "immunity", "antibiotic",
    "exercise", "fitness", "sleep", "rest", "mental health",
    "yoga", "meditation",
    "how many bones", "how does the heart work", "how do lungs work",
    "what does the liver do", "what does the kidney do",
    "why do we sleep", "why do we sweat", "why do we need water",
    "health", "healthy", "human body",
  ],

  sports: [
    // Cricket
    "cricket", "batsman", "bowler", "wicket", "innings", "run",
    "test match", "odi", "t20", "ipl", "sachin tendulkar", "virat kohli",
    "swing bowling", "spin bowling", "googly", "yorker", "lbw",
    // Football
    "football", "soccer", "penalty", "offside", "goalkeeper",
    "fifa world cup",
    // Other sports
    "badminton", "tennis", "hockey", "kabaddi", "kho kho",
    "basketball", "volleyball", "wrestling", "boxing",
    "athletics", "sprint", "marathon",
    "swimming", "gymnastics", "chess",
    "olympics", "commonwealth games", "asian games",
    // General
    "athlete", "sports training", "stamina",
    "sport", "tournament", "championship", "medal", "trophy",
    "referee", "umpire", "rules of cricket", "rules of football",
    "fastest runner", "highest jumper",
  ],
  // ── MORE NEW SUBJECTS ──────────────────────────────────────────────────

  reasoning: [
    "pattern", "what comes next", "next number", "next in the series",
    "odd one out", "which is different", "which does not belong",
    "analogy", "is to", "as", "relationship between",
    "riddle", "brain teaser", "puzzle", "trick question",
    "logical", "logic", "reasoning",
    "if then", "true or false",
    "how many squares", "how many triangles",
    "sequence", "series", "complete the",
    "missing number", "find the missing",
    // Logic puzzles with physical setup
    "switches", "switch", "bulb", "light bulb", "figure out which",
    "enter the room only once", "go inside only once",
    "hats", "hat puzzle", "prisoners",
    "liar", "truth teller", "one always lies",
    "weighing", "balance", "heavier", "lighter", "fake coin",
    "crossing the river", "river crossing", "bridge",
    "door", "two doors", "one leads to",
    "handshake", "how many handshakes",
    "who is the", "who is lying", "who stole",
    "arrangement", "seating arrangement", "sitting in a row",
    "blood relation", "relation puzzle",
    "clock", "clock angle", "mirror image",
    "dice", "opposite face", "cube",
    "coding decoding", "code language",
    "direction", "direction sense", "facing north",
    "calendar", "what day", "which day",
    "venn diagram", "syllogism",
  ],

  lifeskills: [
    "pocket money", "savings", "budget", "budgeting",
    "needs and wants", "bank account", "atm",
    "timetable", "study plan", "time management",
    "fire safety", "road safety", "stranger danger",
    "online safety", "cyber safety", "internet safety",
    "how to save money", "how to plan",
    "first aid", "emergency", "earthquake safety",
    "good manners", "introduce myself", "say sorry",
    "bullying", "bully", "peer pressure",
    "life skill", "practical knowledge",
    "post office", "how does a bank work",
    "how to write a cheque", "how to send a letter",
  ],

  "creative-thinking": [
    "what would happen if", "what if there was no", "what if humans could",
    "what if the sun", "what if there were no",
    "design a", "invent a", "create a machine", "build a machine",
    "how would you", "imagine if", "pretend that",
    "what would you do if", "if you could travel",
    "if you could talk to", "if you were invisible",
    "school of the future", "city of the future",
    "how can we reduce", "how can we save", "how can we help",
    "how to solve the problem of", "find a solution",
    "think of a way", "come up with an idea",
    "creative", "brainstorm", "innovation",
  ],

  "study-skills": [
    "how to study", "how to memorize", "how to remember",
    "how to prepare for exam", "how to prepare for test",
    "study tips", "study method", "study plan", "study timetable",
    "how to make notes", "note making", "note taking",
    "how to focus", "how to concentrate", "cannot concentrate",
    "get distracted", "easily distracted",
    "how to revise", "revision tips", "revision method",
    "how to learn faster", "how to learn better",
    "memory trick", "memory technique", "mnemonic",
    "exam tips", "exam preparation", "exam strategy",
    "time management", "time table", "balance study",
    "how to avoid mistakes", "silly mistakes",
    "how to finish paper on time", "exam time",
    "how to score more", "how to get good marks",
    "how to improve", "weak in", "not good at",
    "pomodoro", "active recall", "spaced repetition",
    "how to write faster", "handwriting speed",
  ],

  hindi: [
    // Hindi grammar terms
    "संज्ञा", "सर्वनाम", "विशेषण", "क्रिया", "क्रिया विशेषण",
    "वचन", "एकवचन", "बहुवचन", "लिंग", "पुल्लिंग", "स्त्रीलिंग",
    "काल", "भूतकाल", "वर्तमानकाल", "भविष्यकाल",
    "संधि", "समास", "उपसर्ग", "प्रत्यय",
    "विराम चिह्न", "पूर्ण विराम",
    "पर्यायवाची", "विलोम", "मुहावरे", "लोकोक्ति",
    "अलंकार", "उपमा", "रूपक", "अनुप्रास",
    "पत्र लेखन", "निबंध", "अनुच्छेद",
    // English terms for Hindi grammar concepts
    "hindi grammar", "vyakaran", "sangya", "sarvanam",
    "visheshan", "kriya", "vachan", "ling", "kaal",
    "sandhi", "samas", "upsarg", "pratyay",
    "matra", "matras", "hindi letter", "hindi alphabet",
    "hindi meaning", "hindi word", "hindi sentence",
    "patra lekhan", "nibandh",
    "muhavare", "lokokti",
  ],
};

// Detection order — more specific subjects before broader ones
// to prevent "history" or "science" from swallowing specific GK/civics/sports queries
const DETECTION_ORDER = [
  "study-skills", "creative-thinking",
  "reasoning", "lifeskills", "hindi",
  "sports", "health", "civics", "gk",
  "technology", "environment", "english",
  "geography", "history", "science",
];

export function detectSubject(question: string): string {
  if (isMathQuestion(question)) return "math";

  const lower = question.toLowerCase().trim();
  let bestMatch = "general";
  let maxScore = 0;

  for (const subject of DETECTION_ORDER) {
    const keywords = SUBJECT_KEYWORDS[subject];
    if (!keywords) continue;

    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        // Multi-word keywords are more specific — give them extra weight
        score += kw.includes(" ") ? 2 : 1;
      }
    }
    if (score > maxScore) {
      maxScore = score;
      bestMatch = subject;
    }
  }

  return bestMatch;
}
