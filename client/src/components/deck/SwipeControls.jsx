import React from 'react';
import { X, Flame, Heart } from 'lucide-react';

export default function SwipeControls({ handleVote }) {
  return (
    <div className="w-full max-w-md mx-auto px-6 pt-1 pb-[max(1.25rem,env(safe-area-inset-bottom))] flex items-center justify-center gap-5 shrink-0 select-none z-20">
      {/* Pass Button */}
      <button
        type="button"
        onClick={() => handleVote(-1)}
        aria-label="Pass option"
        className="w-14 h-14 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-main)] hover:border-rose-500/50 hover:bg-rose-500/10 text-rose-500 flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer"
      >
        <X size={26} strokeWidth={2.4} />
      </button>

      {/* Veto Button */}
      <button
        type="button"
        onClick={() => handleVote(-100)}
        aria-label="Veto option"
        title="Remove option for the whole group"
        className="w-11 h-11 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-main)] hover:border-amber-500/50 hover:bg-amber-500/10 text-amber-500 flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer"
      >
        <Flame size={20} strokeWidth={2.2} />
      </button>

      {/* Like Button */}
      <button
        type="button"
        onClick={() => handleVote(1)}
        aria-label="Like option"
        className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-[0_6px_20px_rgba(16,185,129,0.35)] hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer"
      >
        <Heart size={26} strokeWidth={2.4} className="fill-white" />
      </button>
    </div>
  );
}

