import React from 'react';
import { X, Flame, Heart } from 'lucide-react';

export default function SwipeControls({ handleVote }) {
  return (
    <div className="w-full max-w-md mx-auto px-4 pt-1 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col items-center gap-1.5 shrink-0 select-none z-20">
      <div className="glass-surface py-2.5 px-6 rounded-full flex items-center gap-6 shadow-[0_12px_32px_rgba(0,0,0,0.14)] border border-[var(--border-glass)]">
        {/* Pass Button */}
        <button
          type="button"
          onClick={() => handleVote(-1)}
          aria-label="Pass option"
          className="flex flex-col items-center gap-1 group cursor-pointer active:scale-90 transition-transform duration-150"
        >
          <div className="w-13 h-13 rounded-full bg-[var(--bg-surface)] border border-rose-500/30 group-hover:border-rose-500/60 group-hover:bg-rose-500/10 text-rose-500 flex items-center justify-center shadow-sm transition-colors">
            <X size={24} strokeWidth={2.4} />
          </div>
          <span className="text-[11px] font-bold text-[var(--text-secondary)] tracking-tight">
            Pass
          </span>
        </button>

        {/* Veto Button */}
        <button
          type="button"
          onClick={() => handleVote(-100)}
          aria-label="Veto option"
          title="Remove option for the whole group"
          className="flex flex-col items-center gap-1 group cursor-pointer active:scale-90 transition-transform duration-150"
        >
          <div className="w-11 h-11 rounded-full bg-[var(--bg-surface)] border border-amber-500/30 group-hover:border-amber-500/60 group-hover:bg-amber-500/15 text-amber-500 flex items-center justify-center shadow-xs transition-colors">
            <Flame size={20} strokeWidth={2.2} />
          </div>
          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 tracking-tight">
            Veto
          </span>
        </button>

        {/* Like Button */}
        <button
          type="button"
          onClick={() => handleVote(1)}
          aria-label="Like option"
          className="flex flex-col items-center gap-1 group cursor-pointer active:scale-90 transition-transform duration-150"
        >
          <div className="w-13 h-13 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-[0_4px_16px_rgba(16,185,129,0.35)] transition-colors">
            <Heart size={24} strokeWidth={2.4} className="fill-white" />
          </div>
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
            Like
          </span>
        </button>
      </div>
    </div>
  );
}
