import React from 'react';
import { X, Flame, Heart } from 'lucide-react';

export default function SwipeControls({ handleVote }) {
  return (
    <div className="fixed bottom-6 inset-x-0 mx-auto w-max z-30 flex flex-col items-center gap-2 select-none">
      <div className="glass-surface py-2.5 px-6 rounded-full flex items-center gap-5 shadow-[0_16px_48px_rgba(0,0,0,0.25)] border border-[var(--border-glass)]">
        {/* Left: Pass (56px circle, X icon) */}
        <button
          type="button"
          onClick={() => handleVote(-1)}
          aria-label="Pass option"
          className="w-14 h-14 rounded-full bg-[var(--bg-elevated)] border-2 border-rose-500/30 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 hover:border-rose-500/60 flex items-center justify-center shadow-md active:scale-90 hover:scale-105 transition-all cursor-pointer"
        >
          <X size={26} strokeWidth={2.5} />
        </button>

        {/* Center: VETO (48px amber/red fire circle) */}
        <button
          type="button"
          onClick={() => handleVote(-100)}
          aria-label="VETO option"
          className="w-12 h-12 rounded-full bg-gradient-to-tr from-red-600 via-rose-500 to-amber-500 text-white shadow-[0_0_24px_rgba(239,68,68,0.5)] hover:shadow-[0_0_32px_rgba(239,68,68,0.7)] hover:scale-105 active:scale-90 transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer"
          title="Veto this option (hard zero)"
        >
          <Flame size={18} strokeWidth={2.5} />
          <span className="font-extrabold text-[10px] uppercase tracking-wider leading-none">Veto</span>
        </button>

        {/* Right: Like (56px circle, Heart icon) */}
        <button
          type="button"
          onClick={() => handleVote(1)}
          aria-label="Like option"
          className="w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-[0_8px_28px_rgba(16,185,129,0.4)] hover:shadow-[0_12px_36px_rgba(16,185,129,0.55)] hover:scale-105 active:scale-90 transition-all flex items-center justify-center cursor-pointer"
        >
          <Heart size={26} strokeWidth={2.5} className="fill-white" />
        </button>
      </div>

      {/* Subtle Desktop Keyboard Prompt */}
      <div className="hidden sm:flex items-center gap-3 text-[11px] font-medium text-[var(--text-tertiary)]">
        <span><kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[10px]">←</kbd> Pass</span>
        <span><kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[10px]">↓</kbd> Veto</span>
        <span><kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[10px]">→</kbd> Like</span>
      </div>
    </div>
  );
}
