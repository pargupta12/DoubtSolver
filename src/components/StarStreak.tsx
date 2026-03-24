/**
 * StarStreak — compact header widget showing ⭐ stars and 🔥 streak.
 * Tapping opens the badge shelf.
 */
import type { GameState, BadgeDef } from "@/lib/game-state";
import { BADGE_DEFS } from "@/lib/game-state";
import { useState } from "react";

interface Props {
  gameState: GameState;
  language: "en" | "hi";
}

export default function StarStreak({ gameState, language }: Props) {
  const [showBadges, setShowBadges] = useState(false);

  const earned: BadgeDef[] = gameState.badges
    .map((id) => BADGE_DEFS[id])
    .filter((b): b is BadgeDef => !!b);

  const locked: BadgeDef[] = Object.values(BADGE_DEFS).filter(
    (b) => !gameState.badges.includes(b.id)
  );

  return (
    <div className="flex flex-col gap-2">
      {/* Pill row */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowBadges((v) => !v)}
          className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-white border border-indigo-100 shadow-sm hover:bg-indigo-50 transition"
          title={language === "hi" ? "बैज देखो" : "View badges"}
        >
          <span className="text-sm font-semibold text-amber-500">
            ⭐ {gameState.stars}
          </span>
          <span className="w-px h-3.5 bg-gray-200" />
          <span className="text-sm font-semibold text-orange-500">
            🔥 {gameState.streak.count}
            <span className="ml-1 text-xs font-normal text-gray-500">
              {language === "hi" ? "दिन" : "day"}{gameState.streak.count !== 1 && language === "en" ? "s" : ""}
            </span>
          </span>
          {earned.length > 0 && (
            <>
              <span className="w-px h-3.5 bg-gray-200" />
              <span className="text-xs text-indigo-500 font-medium">
                {earned.length} 🏅
              </span>
            </>
          )}
        </button>

        {/* Streak motivator */}
        {gameState.streak.count > 0 && gameState.streak.count < 3 && (
          <span className="text-xs text-gray-400 italic">
            {language === "hi"
              ? `${3 - gameState.streak.count} दिन और → 🔥 बैज`
              : `${3 - gameState.streak.count} more day${3 - gameState.streak.count !== 1 ? "s" : ""} → 🔥 badge`}
          </span>
        )}
      </div>

      {/* Badge shelf — expands inline */}
      {showBadges && (
        <div className="rounded-2xl border border-indigo-100 bg-white shadow-sm p-3">
          <p className="text-xs font-semibold text-indigo-700 mb-2">
            {language === "hi" ? "🏅 तुम्हारे बैज" : "🏅 Your badges"}
          </p>

          {earned.length === 0 && (
            <p className="text-xs text-gray-400 mb-2">
              {language === "hi"
                ? "अभी तक कोई बैज नहीं — पूछते रहो!"
                : "No badges yet — keep asking questions!"}
            </p>
          )}

          {/* Earned */}
          {earned.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {earned.map((b) => (
                <div
                  key={b.id}
                  title={b.desc}
                  className="flex flex-col items-center gap-0.5 bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2 cursor-default"
                >
                  <span className="text-xl">{b.emoji}</span>
                  <span className="text-xs font-semibold text-indigo-700">{b.label}</span>
                  <span className="text-[10px] text-gray-400 text-center leading-tight max-w-[80px]">{b.desc}</span>
                </div>
              ))}
            </div>
          )}

          {/* Locked */}
          {locked.length > 0 && (
            <>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                {language === "hi" ? "अभी तक नहीं मिले" : "Not yet unlocked"}
              </p>
              <div className="flex flex-wrap gap-2">
                {locked.map((b) => (
                  <div
                    key={b.id}
                    title={b.desc}
                    className="flex flex-col items-center gap-0.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 opacity-50 cursor-default"
                  >
                    <span className="text-xl grayscale">{b.emoji}</span>
                    <span className="text-xs font-medium text-gray-500">{b.label}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
