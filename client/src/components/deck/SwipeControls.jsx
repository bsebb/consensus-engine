import React from 'react';
import { X, Heart, Star, Flame, RotateCcw } from 'lucide-react';
import { triggerHaptic, hapticTrigger } from '../../utils/haptics';
import { useLanguage } from '../../context/LanguageContext';

export default function SwipeControls({
  handleVote,
  handleUndo,
  canUndo = false,
  vetoesRemaining = 1,
  superlikesRemaining = 1,
}) {
  const { t } = useLanguage();
  const hasVeto = vetoesRemaining > 0;
  const hasSuper = superlikesRemaining > 0;

  return (
    <div className="w-full max-w-md mx-auto px-4 pt-1 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center justify-center shrink-0 select-none z-20">
      <div className="flex items-center justify-between gap-2 sm:gap-3 px-3.5 py-2 rounded-3xl bg-[var(--bg-elevated)]/92 backdrop-blur-xl border border-[var(--border-main)] shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
        {/* Undo Action */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            ref={hapticTrigger}
            type="button"
            disabled={!canUndo}
            onClick={() => {
              if (canUndo && handleUndo) {
                triggerHaptic('tap');
                handleUndo();
              }
            }}
            aria-label="Undo last swipe"
            title="Undo last swipe (Z or Backspace)"
            className={`w-11 h-11 rounded-2xl border flex items-center justify-center transition-all duration-150 cursor-pointer ${
              canUndo
                ? 'bg-[var(--bg-surface)] border-[var(--border-main)] hover:border-amber-400/50 hover:bg-amber-400/10 text-[var(--text-secondary)] hover:text-amber-500 shadow-2xs hover:scale-105 active:scale-95'
                : 'bg-[var(--bg-inset)] border-[var(--border-subtle)] text-[var(--text-tertiary)] opacity-30 cursor-not-allowed scale-95'
            }`}
          >
            <RotateCcw size={17} strokeWidth={2.4} />
          </button>
          <span className="text-[10px] font-semibold text-[var(--text-tertiary)] tracking-tight">
            {t('ctrlUndo') || 'Undo'}
          </span>
        </div>

        {/* Pass Action */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            ref={hapticTrigger}
            type="button"
            onClick={() => {
              triggerHaptic('pass');
              handleVote?.(-1);
            }}
            aria-label="Pass option"
            title="Pass (ArrowLeft)"
            className="relative w-12 h-12 rounded-2xl bg-[var(--bg-surface)] hover:bg-rose-500/10 border border-[var(--border-main)] hover:border-rose-500/50 text-rose-500 flex items-center justify-center shadow-xs hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer"
          >
            <X size={23} strokeWidth={2.5} />
          </button>
          <span className="text-[10px] font-bold text-rose-500/80 tracking-tight">
            {t('ctrlPass') || 'Pass'}
          </span>
        </div>

        {/* Veto Action (1 per round quota) */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            ref={hapticTrigger}
            type="button"
            onClick={() => {
              triggerHaptic('veto');
              handleVote?.(-100);
            }}
            aria-label={`Veto option (${vetoesRemaining} left)`}
            title={hasVeto ? 'Veto option (1 per round)' : 'Veto already used this round'}
            className={`relative w-11 h-11 rounded-2xl border flex items-center justify-center transition-all duration-150 cursor-pointer ${
              hasVeto
                ? 'bg-[var(--bg-surface)] hover:bg-red-600/10 border-[var(--border-main)] hover:border-red-500/50 text-red-500 shadow-2xs hover:scale-105 active:scale-95'
                : 'bg-[var(--bg-inset)] border-[var(--border-subtle)] text-[var(--text-tertiary)] opacity-45 scale-95'
            }`}
          >
            <Flame size={18} strokeWidth={2.3} />
            <span
              data-testid="veto-quota-badge"
              className={`absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full text-[10px] font-black flex items-center justify-center tabular-nums shadow-2xs ${
                hasVeto
                  ? 'bg-red-500 text-white'
                  : 'bg-[var(--bg-elevated)] border border-[var(--border-main)] text-[var(--text-tertiary)]'
              }`}
            >
              {vetoesRemaining}
            </span>
          </button>
          <span className={`text-[10px] font-bold tracking-tight ${hasVeto ? 'text-red-500/80' : 'text-[var(--text-tertiary)] opacity-60'}`}>
            {t('ctrlVeto') || 'Veto'}
          </span>
        </div>

        {/* Superlike Action (1 per round quota) */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            ref={hapticTrigger}
            type="button"
            onClick={() => {
              triggerHaptic('superlike');
              handleVote?.(2);
            }}
            aria-label={`Superlike option (${superlikesRemaining} left)`}
            title={hasSuper ? 'Superlike option (1 per round)' : 'Superlike already used this round'}
            className={`relative w-11 h-11 rounded-2xl border flex items-center justify-center transition-all duration-150 cursor-pointer ${
              hasSuper
                ? 'bg-[var(--bg-surface)] hover:bg-amber-400/10 border-[var(--border-main)] hover:border-amber-400/50 text-amber-500 shadow-2xs hover:scale-105 active:scale-95'
                : 'bg-[var(--bg-inset)] border-[var(--border-subtle)] text-[var(--text-tertiary)] opacity-45 scale-95'
            }`}
          >
            <Star size={18} strokeWidth={2.3} className={hasSuper ? 'fill-amber-400/20' : ''} />
            <span
              data-testid="superlike-quota-badge"
              className={`absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full text-[10px] font-black flex items-center justify-center tabular-nums shadow-2xs ${
                hasSuper
                  ? 'bg-amber-500 text-black'
                  : 'bg-[var(--bg-elevated)] border border-[var(--border-main)] text-[var(--text-tertiary)]'
              }`}
            >
              {superlikesRemaining}
            </span>
          </button>
          <span className={`text-[10px] font-bold tracking-tight ${hasSuper ? 'text-amber-500/80' : 'text-[var(--text-tertiary)] opacity-60'}`}>
            {t('ctrlSuper') || 'Super'}
          </span>
        </div>

        {/* Like Action */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            ref={hapticTrigger}
            type="button"
            onClick={() => {
              triggerHaptic('like');
              handleVote?.(1);
            }}
            aria-label="Like option"
            title="Like (ArrowRight)"
            className="relative w-12 h-12 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-[0_4px_16px_rgba(16,185,129,0.35)] hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer"
          >
            <Heart size={23} strokeWidth={2.5} className="fill-white" />
          </button>
          <span className="text-[10px] font-bold text-emerald-500 tracking-tight">
            {t('ctrlLike') || 'Like'}
          </span>
        </div>
      </div>
    </div>
  );
}
