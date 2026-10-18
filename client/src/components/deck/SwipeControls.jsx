import React from 'react';
import { X, Flame, Check } from 'lucide-react';

export default function SwipeControls({ handleVote }) {
  return (
    <div className="fixed bottom-6 inset-x-0 mx-auto w-max z-30 glass-surface py-2 px-6 rounded-full flex items-center gap-6 shadow-[0_12px_40px_rgba(0,0,0,0.3)] border border-[var(--border-glass)] select-none">
      {/* Left: Pass (48px circle, X icon) */}
      <button
        type="button"
        onClick={() => handleVote(-1)}
        aria-label="Pass option"
        className="w-12 h-12 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-main)] text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 flex items-center justify-center shadow-md active:scale-90 transition-transform cursor-pointer"
      >
        <X size={22} strokeWidth={2.5} />
      </button>

      {/* Center: VETO (58px glowing amber/red circle, Flame icon, VETO text, active spring bounce) */}
      <button
        type="button"
        onClick={() => handleVote(-100)}
        aria-label="VETO option"
        className="w-[58px] h-[58px] rounded-full bg-gradient-to-tr from-red-600 via-rose-500 to-amber-500 text-white shadow-[0_0_24px_rgba(239,68,68,0.55)] hover:shadow-[0_0_32px_rgba(239,68,68,0.75)] hover:scale-105 active:scale-95 transition-all duration-200 flex flex-col items-center justify-center gap-0.5 cursor-pointer"
      >
        <Flame size={20} strokeWidth={2.5} />
        <span className="font-black text-[10px] uppercase tracking-wider leading-none">VETO</span>
      </button>

      {/* Right: Approve (48px circle, Check icon) */}
      <button
        type="button"
        onClick={() => handleVote(1)}
        aria-label="Approve option"
        className="w-12 h-12 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-main)] text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10 flex items-center justify-center shadow-md active:scale-90 transition-transform cursor-pointer"
      >
        <Check size={22} strokeWidth={2.5} />
      </button>
    </div>
  );
}
