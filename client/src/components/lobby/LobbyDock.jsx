import React from 'react';
import { ArrowRight } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';
import { useLanguage } from '../../context/LanguageContext';

export default function LobbyDock({
  isVotingActive = false,
  isHost = false,
  candidateCount = 0,
  mode = 'DISCOVERY',
  onResumeVoting,
  onStartVoting,
}) {
  const { t } = useLanguage();

  return (
    <div className="fixed bottom-0 inset-x-0 p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-[var(--bg-root)] via-[var(--bg-root)]/90 to-transparent pointer-events-none z-30">
      <div className="max-w-md mx-auto pointer-events-auto">
        {isVotingActive ? (
          <button
            type="button"
            onClick={() => {
              triggerHaptic('selection');
              onResumeVoting?.();
            }}
            className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm tracking-tight flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(16,185,129,0.32)] active:scale-[0.98] transition-all cursor-pointer"
          >
            <span>{t('resume') || 'Resume voting'}</span>
            <ArrowRight size={16} />
          </button>
        ) : isHost ? (
          <button
            type="button"
            disabled={candidateCount < 2}
            onClick={() => {
              triggerHaptic('selection');
              onStartVoting?.();
            }}
            className="w-full h-12 rounded-2xl bg-[var(--accent-bg)] hover:bg-[var(--accent-bg-hover)] disabled:opacity-50 text-white font-bold text-sm tracking-tight flex items-center justify-center gap-2 shadow-[0_4px_20px_var(--accent-glow)] active:scale-[0.98] transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            <span>{t('startVoting') || 'Start voting'}</span>
            <span className="opacity-90 font-semibold tabular-nums">
              ({candidateCount} {mode === 'CUSTOM' ? (t('optionsLabel') || 'options') : (t('placesLabel') || 'places')})
            </span>
            <ArrowRight size={16} />
          </button>
        ) : (
          <div className="w-full h-12 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-main)] flex items-center justify-center gap-2 text-xs font-semibold text-[var(--text-primary)] shadow-2xs">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>{t('hostSettingTable') || 'Host is setting the table...'}</span>
          </div>
        )}
      </div>
    </div>
  );
}
