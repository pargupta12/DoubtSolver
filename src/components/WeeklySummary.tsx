/**
 * WeeklySummary — weekly progress card.
 * Shows questions asked, Quick Checks passed, stars earned, and topics covered.
 * Has a "Share" button that copies a text summary to the clipboard.
 */
import type { WeeklySummaryData } from "@/lib/game-state";
import { SUBJECT_META } from "@/lib/subject-meta";
import { useState } from "react";

interface Props {
  data: WeeklySummaryData;
  language: "en" | "hi";
  onClose: () => void;
}

function dayName(language: "en" | "hi"): string {
  const days =
    language === "hi"
      ? ["रवि", "सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि"]
      : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[new Date().getDay()] ?? "";
}

export default function WeeklySummary({ data, language, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  const shareText =
    language === "hi"
      ? `📚 DoubtSolver — इस हफ्ते की रिपोर्ट\n` +
        `❓ ${data.questions} सवाल पूछे\n` +
        `✅ ${data.passed} Quick Check सही\n` +
        `⭐ ${data.stars} स्टार कमाए\n` +
        (data.topTopics.length
          ? `📌 विषय: ${data.topTopics.map((t) => t.topic).join(", ")}`
          : "")
      : `📚 DoubtSolver — This week's report\n` +
        `❓ ${data.questions} question${data.questions !== 1 ? "s" : ""} asked\n` +
        `✅ ${data.passed} Quick Check${data.passed !== 1 ? "s" : ""} passed\n` +
        `⭐ ${data.stars} stars earned\n` +
        (data.topTopics.length
          ? `📌 Topics: ${data.topTopics.map((t) => t.topic).join(", ")}`
          : "");

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: do nothing
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/30 p-4"
      onClick={onClose}
    >
      {/* Card */}
      <div
        className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-5 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide">
              {language === "hi" ? "इस हफ्ते" : "This week"}
            </p>
            <h2 className="text-lg font-bold text-gray-900 leading-tight">
              {language === "hi" ? "तुम्हारी पढ़ाई 📊" : "Your Progress 📊"}
            </h2>
          </div>
          <button
            type="button" onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition text-xl leading-none"
            aria-label="Close"
          >✕</button>
        </div>

        {/* Stat pills */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { emoji: "❓", value: data.questions, label: language === "hi" ? "सवाल" : "Questions" },
            { emoji: "✅", value: data.passed,    label: language === "hi" ? "सही" : "Correct" },
            { emoji: "⭐", value: data.stars,     label: language === "hi" ? "स्टार" : "Stars" },
          ].map(({ emoji, value, label }) => (
            <div key={label} className="flex flex-col items-center bg-indigo-50 rounded-2xl py-3 px-2">
              <span className="text-2xl">{emoji}</span>
              <span className="text-xl font-bold text-indigo-700 leading-tight">{value}</span>
              <span className="text-[10px] text-gray-500 mt-0.5">{label}</span>
            </div>
          ))}
        </div>

        {/* Topics studied */}
        {data.topTopics.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1.5">
              {language === "hi" ? "📌 इस हफ्ते पढ़ा" : "📌 Topics studied"}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {data.topTopics.map(({ topic, passed, subject }) => {
                const meta = SUBJECT_META[subject] ?? SUBJECT_META["general"]!;
                return (
                  <span
                    key={topic}
                    className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${
                      passed
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-gray-100 text-gray-600 border border-gray-200"
                    }`}
                  >
                    {passed ? "🌿" : "🌱"} {meta.icon}{" "}
                    {topic.charAt(0).toUpperCase() + topic.slice(1)}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {data.questions === 0 && (
          <p className="text-sm text-gray-400 text-center py-2">
            {language === "hi"
              ? "इस हफ्ते अभी तक कोई सवाल नहीं — आज से शुरू करो! 🚀"
              : "No questions yet this week — start asking today! 🚀"}
          </p>
        )}

        {/* Share + Close */}
        <div className="flex gap-2 pt-1">
          <button
            type="button" onClick={handleShare}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition"
          >
            {copied
              ? (language === "hi" ? "✅ कॉपी हो गया!" : "✅ Copied!")
              : (language === "hi" ? "📤 शेयर करो" : "📤 Share")}
          </button>
          <button
            type="button" onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition"
          >
            {language === "hi" ? "बंद करो" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}
