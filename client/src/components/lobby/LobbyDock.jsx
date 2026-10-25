import React from 'react';
import { ArrowRight, Play, Sparkles, CheckCircle2 } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';
import { useLanguage } from '../../context/LanguageContext';

export default function LobbyDock({
  isVotingActive = false,
  isHost = false,
  candidateCount = 0,
  participants = [],
  mode = 'DISCOVERY',
  onResumeVoting,
  onStartVoting,
}) {
  const { t } = useLanguage();
  const isReady = candidateCount >= 2;
  const hostEntry = participants.find((p) => p.isHost);
  const hostName = hostEntry?.name || 'Host';
  const itemUnit = mode === 'CUSTOM' ? (t('optionsLabel') || 'options') : (t('placesLabel') || 'places');

  return (
    <div className="fixed bottom-0 inset-x-0 p-3.5 sm:p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-[var(--bg-root)] via-[var(--bg-root)]/95 to-transparent pointer-events-none z-30">
      <div className="max-w-md mx-auto pointer-events-auto flex flex-col gap-1.5">
        {isVotingActive ? (
          <button
            type="button"
            onClick={() => {
              triggerHaptic('selection');
              onResumeVoting?.();
            }}
            className="w-full h-12 sm:h-13 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm sm:text-base tracking-tight flex items-center justify-center gap-2 shadow-[0_6px_24px_rgba(16,185,129,0.35)] active:scale-[0.98] transition-all cursor-pointer"
          >
            <span>{t('resume') || 'Resume voting'}</span>
            <ArrowRight size={17} />
          </button>
        ) : isHost ? (
          <div className="p-2 rounded-3xl bg-[var(--bg-elevated)]/95 backdrop-blur-md border border-[var(--border-main)] shadow-[0_12px_36px_rgba(0,0,0,0.18)] flex flex-col gap-1.5">
            <div className="flex items-center justify-between px-2.5 pt-0.5 text-[11px] font-semibold">
              {isReady ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                  <span className="tabular-nums">
                    Table ready ({candidateCount} {itemUnit} - {Math.max(1, participants.length)} in room)
                  </span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <Sparkles size={12} className="shrink-0" />
                  <span>Add {Math.max(1, 2 - candidateCount)} more to start voting</span>
                </span>
              )}
              {isReady && (
                <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-md bg-[var(--bg-inset)] border border-[var(--border-subtle)] text-[10px] font-bold text-[var(--text-tertiary)]">
                  Press Enter
                </span>
              )}
            </div>

            <button
              type="button"
              data-testid="host-start-voting-cta"
              disabled={!isReady}
              onClick={() => {
                triggerHaptic('selection');
                onStartVoting?.();
              }}
              className="w-full h-12 sm:h-13 rounded-2xl bg-[var(--accent-bg)] hover:bg-[var(--accent-bg-hover)] disabled:opacity-45 text-white font-extrabold text-sm sm:text-base tracking-tight flex items-center justify-center gap-2.5 shadow-[0_6px_24px_var(--accent-glow)] active:scale-[0.98] transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              <Play size={15} className="fill-current shrink-0" />
              <span>{t('startVoting') || 'Start voting'}</span>
              <span className="px-2 py-0.5 rounded-full bg-white/20 text-xs font-bold tabular-nums">
                {candidateCount} {itemUnit}
              </span>
              <ArrowRight size={17} className="shrink-0" />
            </button>
          </div>
        ) : (
          <div
            data-testid="guest-waiting-status"
            className="w-full px-4 py-3 rounded-2xl bg-[var(--bg-elevated)]/95 backdrop-blur-md border border-[var(--border-main)] flex items-center justify-between gap-3 shadow-lg"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <div className="flex flex-col min-w-0 text-left">
                <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                  {t('hostSettingTable') || `Waiting for ${hostName} to start swiping...`}
                </span>
                <span className="text-[11px] text-[var(--text-secondary)] truncate tabular-nums">
                  {candidateCount} {itemUnit} on the table - Suggest spots above
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/12 border border-emerald-500/25 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0 tabular-nums">
              Ready ({candidateCount})
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
