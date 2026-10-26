import React, { useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

export default function DeckHint({ onDismiss }) {
  const [visible, setVisible] = useState(() => {
    try {
      return !localStorage.getItem('consensus_deck_hint_seen');
    } catch {
      return true;
    }
  });

  const handleDismiss = () => {
    triggerHaptic('tap');
    setVisible(false);
    try {
      localStorage.setItem('consensus_deck_hint_seen', 'true');
    } catch {}
    onDismiss?.();
  };

  if (!visible) return null;

  return (
    <div
      onClick={handleDismiss}
      className="mx-auto max-w-sm w-[92%] mb-2 py-2 px-3.5 rounded-full bg-black/85 backdrop-blur-xl border border-white/20 text-white shadow-2xl flex items-center justify-between gap-2.5 cursor-pointer select-none transition-all animate-[fadeIn_0.25s_ease-out]"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 min-w-0">
        <Sparkles size={14} className="text-amber-400 shrink-0" />
        <span className="text-[11px] sm:text-xs font-semibold tracking-tight text-white/95 truncate">
          Swipe ← pass &nbsp; → like &nbsp; ↑ super &nbsp; ↓ veto
        </span>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleDismiss();
        }}
        aria-label="Dismiss swipe instructions"
        className="w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center shrink-0 transition-colors"
      >
        <X size={12} strokeWidth={2.5} />
      </button>
    </div>
  );
}
