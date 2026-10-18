import React from 'react';
import { X, Flame, Heart } from 'lucide-react';

export default function SwipeControls({ handleVote }) {
  return (
    <div className="w-full max-w-md mx-auto px-4 pt-1 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col items-center gap-2 shrink-0 select-none z-20">
      <div className="glass-surface py-2.5 px-7 rounded-full flex items-center gap-6 shadow-md border border-[var(--border-glass)]">
        {/* Left: Pass */}
        <button
          type="button"
          onClick={() => handleVote(-1)}
          aria-label="Pass option"
          className="flex flex-col items-center gap-1 group cursor-pointer"
        >
          <div className="w-13 h-13 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-main)] group-hover:border-rose-500/50 text-rose-500 flex items-center justify-center shadow-xs transition-all">
            <X size={24} strokeWidth={2.5} />
          </div>
          <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
            Pass
          </span>
        </button>

        {/* Center: Veto */}
        <button
          type="button"
          onClick={() => handleVote(-100)}
          aria-label="Veto option"
          className="flex flex-col items-center gap-1 group cursor-pointer"
          title="Hard no - removes this option for the group"
        >
          <div className="w-11 h-11 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500 group-hover:text-white flex items-center justify-center shadow-xs transition-all">
            <Flame size={20} strokeWidth={2.2} />
          </div>
          <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
            Veto
          </span>
        </button>

        {/* Right: Like */}
        <button
          type="button"
          onClick={() => handleVote(1)}
          aria-label="Like option"
          className="flex flex-col items-center gap-1 group cursor-pointer"
        >
          <div className="w-13 h-13 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm group-hover:bg-emerald-600 transition-all">
            <Heart size={24} strokeWidth={2.5} className="fill-white" />
          </div>
          <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
            Like
          </span>
        </button>
      </div>
    </div>
  );
}
