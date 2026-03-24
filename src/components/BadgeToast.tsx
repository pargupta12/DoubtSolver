/**
 * BadgeToast — slides up from the bottom when a badge is newly earned.
 * Auto-dismisses after 3.5 seconds.
 */
import { useEffect, useState } from "react";
import type { BadgeDef } from "@/lib/game-state";

interface Props {
  badge: BadgeDef | null;
  onDismiss: () => void;
}

export default function BadgeToast({ badge, onDismiss }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!badge) { setVisible(false); return; }
    // Small delay so CSS transition plays
    const show = setTimeout(() => setVisible(true), 50);
    const hide = setTimeout(() => { setVisible(false); }, 3200);
    const remove = setTimeout(() => { onDismiss(); }, 3700);
    return () => { clearTimeout(show); clearTimeout(hide); clearTimeout(remove); };
  }, [badge, onDismiss]);

  if (!badge) return null;

  return (
    <div
      className={`fixed bottom-6 left-1/2 z-50 transition-all duration-500 ease-out
        ${visible ? "-translate-x-1/2 translate-y-0 opacity-100" : "-translate-x-1/2 translate-y-12 opacity-0"}`}
    >
      <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-indigo-600 text-white shadow-2xl min-w-[260px] max-w-[320px]">
        <span className="text-3xl">{badge.emoji}</span>
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-semibold uppercase tracking-widest opacity-75">
            Badge Unlocked!
          </span>
          <span className="text-base font-bold leading-tight">{badge.label}</span>
          <span className="text-xs opacity-80 mt-0.5">{badge.desc}</span>
        </div>
      </div>
    </div>
  );
}
