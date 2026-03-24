/**
 * TopicMastery — collapsible panel showing every topic the child has studied,
 * with a mastery seed icon: 🌱 (seen) → 🌿 (Quick Check passed)
 */
import { useState } from "react";
import type { TopicRecord } from "@/lib/game-state";
import { SUBJECT_META } from "@/lib/subject-meta";

interface Props {
  topics: Record<string, TopicRecord>;
  language: "en" | "hi";
}

function masteryIcon(t: TopicRecord): string {
  if (t.quickCheckPassed) return "🌿";
  return "🌱";
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function TopicMastery({ topics, language }: Props) {
  const [open, setOpen] = useState(false);
  const entries = Object.entries(topics).sort((a, b) =>
    b[1].lastSeen.localeCompare(a[1].lastSeen)
  );

  if (entries.length === 0) return null;

  const passed = entries.filter(([, v]) => v.quickCheckPassed).length;

  return (
    <div className="rounded-2xl border border-emerald-100 bg-white shadow-sm overflow-hidden">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-emerald-50 transition"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">📚</span>
          <span className="text-sm font-semibold text-emerald-800">
            {language === "hi" ? "मैंने क्या सीखा" : "What I've Learned"}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
            {entries.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            🌿 {passed} / {entries.length}
          </span>
          <span className="text-gray-400 text-xs">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {/* Topic grid */}
      {open && (
        <div className="px-4 pb-4 grid grid-cols-2 gap-2">
          {entries.map(([key, record]) => {
            const subMeta = SUBJECT_META[record.subject] ?? SUBJECT_META["general"]!;
            return (
              <div
                key={key}
                className={`flex items-start gap-2 p-2.5 rounded-xl border text-xs ${
                  record.quickCheckPassed
                    ? "bg-emerald-50 border-emerald-200"
                    : "bg-gray-50 border-gray-100"
                }`}
              >
                <span className="text-base shrink-0">{masteryIcon(record)}</span>
                <div className="min-w-0">
                  <p className="font-medium text-gray-800 leading-snug truncate" title={key}>
                    {capitalize(key)}
                  </p>
                  <p className="text-gray-400 text-[10px] mt-0.5">
                    {subMeta.icon} {subMeta.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      {open && (
        <div className="px-4 pb-3 flex gap-4 text-[10px] text-gray-400">
          <span>🌱 {language === "hi" ? "सीखा" : "Seen"}</span>
          <span>🌿 {language === "hi" ? "समझ आया" : "Quick Check passed"}</span>
        </div>
      )}
    </div>
  );
}
