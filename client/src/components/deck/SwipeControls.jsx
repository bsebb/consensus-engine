import React from 'react';
import { X, Heart, Star, Ban, RotateCcw } from 'lucide-react';
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
    <nav
      aria-label="Voting actions"
      className="w-full max-w-md mx-auto px-4 pt-1 pb-[max(0.75rem,env(safe-area-inset-bottom))] relative flex items-center justify-center select-none z-20"
    >
      {/* 4-Button Core Cluster: Veto • Pass • Like • Superlike */}
      {/* Centering is strictly anchored between Pass and Like with equal flanking wings */}
      <div className="flex items-center justify-center gap-3.5 sm:gap-4.5">
        {/* 1. Veto Action (Left Wing, 44px min hit area, Ban icon, distinct crimson) */}
        <button
          ref={hapticTrigger}
          type="button"
          disabled={!hasVeto}
          onClick={() => {
            if (hasVeto) {
              triggerHaptic('veto');
              handleVote?.(-100);
            }
          }}
          aria-label={hasVeto ? `${t('ctrlVeto') || 'Veto'} (1 remaining)` : `${t('ctrlVeto') || 'Veto'} (used)`}
          title={hasVeto ? 'Veto candidate (-100 points, 1 per voter) (V or ArrowDown)' : 'Veto already used'}
          className={`relative min-w-[44px] min-h-[44px] w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-150 ${
            hasVeto
              ? 'bg-[var(--bg-elevated)] border-2 border-[#b91c1c]/50 text-[#b91c1c] hover:bg-[#b91c1c]/15 hover:border-[#b91c1c] shadow-xs hover:scale-105 active:scale-95 cursor-pointer'
              : 'bg-[var(--bg-inset)] border border-[var(--border-subtle)] text-[var(--text-tertiary)] opacity-40 cursor-not-allowed'
          }`}
        >
          <Ban size={18} strokeWidth={2.4} className={hasVeto ? 'text-[#b91c1c]' : ''} />
          <span
            data-testid="veto-quota-badge"
            className={`absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full text-[10px] font-extrabold flex items-center justify-center tabular-nums shadow-2xs border ${
              hasVeto
                ? 'bg-[#b91c1c] text-white border-white dark:border-zinc-900'
                : 'bg-zinc-600 text-zinc-300 border-zinc-700 opacity-60'
            }`}
          >
            {hasVeto ? '1' : '0'}
          </span>
        </button>

        {/* 2. Pass Action (Hero Primary, Left of Center, 58px) */}
        <button
          ref={hapticTrigger}
          type="button"
          onClick={() => {
            triggerHaptic('pass');
            handleVote?.(-1);
          }}
          aria-label={t('ctrlPass') || 'Pass'}
          title="Pass (ArrowLeft)"
          className="min-w-[44px] min-h-[44px] w-14 h-14 sm:w-15 sm:h-15 rounded-full bg-[var(--bg-elevated)] border-2 border-rose-500/40 text-rose-500 hover:bg-rose-500/15 hover:border-rose-400/80 flex items-center justify-center shadow-sm hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer"
        >
          <X size={26} strokeWidth={2.6} />
        </button>

        {/* 3. Like Action (Hero Primary, Right of Center, 58px) */}
        <button
          ref={hapticTrigger}
          type="button"
          onClick={() => {
            triggerHaptic('like');
            handleVote?.(1);
          }}
          aria-label={t('ctrlLike') || 'Like'}
          title="Like (ArrowRight)"
          className="min-w-[44px] min-h-[44px] w-14 h-14 sm:w-15 sm:h-15 rounded-full bg-[var(--bg-elevated)] border-2 border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/15 hover:border-emerald-400/80 flex items-center justify-center shadow-sm hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer"
        >
          <Heart size={26} strokeWidth={2.6} className="fill-emerald-500/20" />
        </button>

        {/* 4. Superlike Action (Right Wing, 44px min hit area, Amber Star) */}
        <button
          ref={hapticTrigger}
          type="button"
          disabled={!hasSuper}
          onClick={() => {
            if (hasSuper) {
              triggerHaptic('superlike');
              handleVote?.(2);
            }
          }}
          aria-label={hasSuper ? `${t('ctrlSuper') || 'Super'} (1 remaining)` : `${t('ctrlSuper') || 'Super'} (used)`}
          title={hasSuper ? 'Superlike (+2 points, 1 per voter) (ArrowUp or S)' : 'Superlike already used'}
          className={`relative min-w-[44px] min-h-[44px] w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-150 ${
            hasSuper
              ? 'bg-[var(--bg-elevated)] border-2 border-amber-500/50 text-amber-500 hover:bg-amber-500/15 hover:border-amber-400 shadow-xs hover:scale-105 active:scale-95 cursor-pointer'
              : 'bg-[var(--bg-inset)] border border-[var(--border-subtle)] text-[var(--text-tertiary)] opacity-40 cursor-not-allowed'
          }`}
        >
          <Star size={18} strokeWidth={2.2} className={hasSuper ? 'fill-amber-400/30' : ''} />
          <span
            data-testid="superlike-quota-badge"
            className={`absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full text-[10px] font-extrabold flex items-center justify-center tabular-nums shadow-2xs border ${
              hasSuper
                ? 'bg-amber-500 text-white border-white dark:border-zinc-900'
                : 'bg-zinc-600 text-zinc-300 border-zinc-700 opacity-60'
            }`}
          >
            {hasSuper ? '1' : '0'}
          </span>
        </button>
      </div>

      {/* 5. Undo Action: Hitbox padded to 44x44pt while visually maintaining 34px circle */}
      <div className="absolute right-2 sm:right-5 top-1/2 -translate-y-1/2">
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
          aria-label={t('ctrlUndo') || 'Undo'}
          title="Undo last swipe (Z or Backspace)"
          className={`min-w-[44px] min-h-[44px] flex items-center justify-center p-1 rounded-full transition-all duration-150 ${
            canUndo ? 'cursor-pointer hover:scale-105 active:scale-95' : 'cursor-not-allowed opacity-35'
          }`}
        >
          <div className={`w-8.5 h-8.5 rounded-full flex items-center justify-center border ${
            canUndo
              ? 'bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-amber-500'
              : 'bg-[var(--bg-inset)] border-transparent text-[var(--text-tertiary)]'
          }`}>
            <RotateCcw size={15} strokeWidth={2.2} />
          </div>
        </button>
      </div>
    </nav>
  );
}
