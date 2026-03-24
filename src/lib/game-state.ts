/**
 * DoubtSolver — Gamification state
 * All data lives in localStorage (no login required).
 * Key: "ds_game_v1"
 */

export interface TopicRecord {
  seen: boolean;
  quickCheckPassed: boolean;
  subject: string;
  lastSeen: string; // YYYY-MM-DD
}

export interface GameState {
  stars: number;
  streak: { count: number; lastDate: string }; // lastDate: YYYY-MM-DD
  badges: string[];
  topics: Record<string, TopicRecord>;
  weeklyStats: {
    questions: number;
    passed: number;
    failed: number;
    weekStart: string; // YYYY-MM-DD (Sunday)
  };
  totalQuickChecks: number;
  totalMathPassed: number;
}

export interface BadgeDef {
  id: string;
  emoji: string;
  label: string;
  desc: string;
}

export const BADGE_DEFS: Record<string, BadgeDef> = {
  first_question: { id: "first_question", emoji: "🌱", label: "Curious Mind",  desc: "Asked your very first question!" },
  streak_3:       { id: "streak_3",       emoji: "🔥", label: "On Fire",       desc: "3 days in a row — keep going!" },
  streak_7:       { id: "streak_7",       emoji: "⚡", label: "Week Warrior",  desc: "7 days straight — incredible!" },
  quick_check_5:  { id: "quick_check_5",  emoji: "🎯", label: "Sharp Mind",   desc: "Passed 5 Quick Checks!" },
  quick_check_10: { id: "quick_check_10", emoji: "🧠", label: "Brain Power",  desc: "Passed 10 Quick Checks!" },
  math_5:         { id: "math_5",         emoji: "🔢", label: "Math Wizard",  desc: "Nailed 5 maths questions!" },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = "ds_game_v1";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function currentWeekStart(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay()); // back to Sunday
  return d.toISOString().slice(0, 10);
}

function defaultState(): GameState {
  return {
    stars: 0,
    streak: { count: 0, lastDate: "" },
    badges: [],
    topics: {},
    weeklyStats: { questions: 0, passed: 0, failed: 0, weekStart: currentWeekStart() },
    totalQuickChecks: 0,
    totalMathPassed: 0,
  };
}

export function loadState(): GameState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultState(), ...(JSON.parse(raw) as Partial<GameState>) };
  } catch {
    // corrupted — start fresh
  }
  return defaultState();
}

function saveState(state: GameState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* storage full */ }
}

/** Awards any badges newly earned. Returns the IDs of newly awarded badges. */
function checkBadges(state: GameState): string[] {
  const fresh: string[] = [];
  const award = (id: string) => {
    if (!state.badges.includes(id)) {
      state.badges.push(id);
      fresh.push(id);
    }
  };
  if (Object.keys(state.topics).length >= 1)  award("first_question");
  if (state.streak.count >= 3)                 award("streak_3");
  if (state.streak.count >= 7)                 award("streak_7");
  if (state.totalQuickChecks >= 5)             award("quick_check_5");
  if (state.totalQuickChecks >= 10)            award("quick_check_10");
  if (state.totalMathPassed >= 5)              award("math_5");
  return fresh;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Call when a new answer arrives (question was asked).
 * +1 ⭐, updates streak, adds topic record.
 */
export function recordQuestion(
  topicKey: string,
  subject: string
): { state: GameState; newBadges: string[] } {
  const state = loadState();
  const today = todayStr();

  // Stars
  state.stars += 1;

  // Streak
  if (state.streak.lastDate === today) {
    // already counted today — nothing
  } else if (state.streak.lastDate === yesterdayStr()) {
    state.streak.count += 1;
    state.streak.lastDate = today;
  } else {
    // gap or first ever
    state.streak.count = 1;
    state.streak.lastDate = today;
  }

  // Topic
  const key = topicKey.toLowerCase().trim().slice(0, 60);
  if (!state.topics[key]) {
    state.topics[key] = { seen: true, quickCheckPassed: false, subject, lastSeen: today };
  } else {
    state.topics[key]!.lastSeen = today;
  }

  // Weekly stats — reset if new week
  if (state.weeklyStats.weekStart !== currentWeekStart()) {
    state.weeklyStats = { questions: 0, passed: 0, failed: 0, weekStart: currentWeekStart() };
  }
  state.weeklyStats.questions += 1;

  const newBadges = checkBadges(state);
  saveState(state);
  return { state: { ...state }, newBadges };
}

/**
 * Call when a Quick Check is submitted and a result is received.
 * +2 ⭐ if passed.
 */
export function recordQuickCheck(
  topicKey: string,
  passed: boolean,
  subject: string
): { state: GameState; newBadges: string[] } {
  const state = loadState();
  const today = todayStr();

  // Reset weekly stats if new week
  if (state.weeklyStats.weekStart !== currentWeekStart()) {
    state.weeklyStats = { questions: 0, passed: 0, failed: 0, weekStart: currentWeekStart() };
  }

  if (passed) {
    state.stars += 2;
    state.totalQuickChecks += 1;
    if (subject === "math") state.totalMathPassed += 1;
    state.weeklyStats.passed += 1;

    const key = topicKey.toLowerCase().trim().slice(0, 60);
    if (state.topics[key]) {
      state.topics[key]!.quickCheckPassed = true;
    } else {
      state.topics[key] = { seen: true, quickCheckPassed: true, subject, lastSeen: today };
    }
  } else {
    state.weeklyStats.failed += 1;
  }

  const newBadges = checkBadges(state);
  saveState(state);
  return { state: { ...state }, newBadges };
}

export interface WeeklySummaryData {
  questions: number;
  passed: number;
  stars: number;
  topTopics: Array<{ topic: string; passed: boolean; subject: string }>;
}

export function getWeeklySummary(): WeeklySummaryData {
  const state = loadState();
  const ws = currentWeekStart();

  const topTopics = Object.entries(state.topics)
    .filter(([, v]) => v.lastSeen >= ws)
    .map(([k, v]) => ({ topic: k, passed: v.quickCheckPassed, subject: v.subject }))
    .slice(0, 6);

  const stats =
    state.weeklyStats.weekStart === ws
      ? state.weeklyStats
      : { questions: 0, passed: 0, failed: 0, weekStart: ws };

  return { questions: stats.questions, passed: stats.passed, stars: state.stars, topTopics };
}
