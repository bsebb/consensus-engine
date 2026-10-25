import React from 'react';
import { CheckCircle2, Check, Clock, Crown, User, Sparkles } from 'lucide-react';
import Button from '../ui/Button';
import { useLanguage } from '../../context/LanguageContext';

export default function WaitingForBallotsView({
  isHost = false,
  votesReceived = 1,
  quorumTotal = 1,
  handleHostForceReveal,
  participants = [],
  votedParticipantIds = [],
  currentParticipantId,
}) {
  const { t } = useLanguage();

  const progressPercent = Math.min(100, (votesReceived / Math.max(1, quorumTotal)) * 100);

  const votesText = t('votesProgressText')
    ? t('votesProgressText').replace('{current}', votesReceived).replace('{total}', quorumTotal)
    : `${votesReceived} of ${quorumTotal} finished`;

  return (
    <main className="px-4 py-4 flex flex-col items-center justify-center text-center flex-1 min-h-0 overflow-y-auto overscroll-contain max-w-md mx-auto w-full animate-[modalSpring_0.35s_var(--spring-smooth)] select-none">
      <div className="w-full rounded-3xl bg-[var(--bg-elevated)] p-6 sm:p-7 border border-[var(--border-main)] flex flex-col items-center gap-4.5 shadow-lg">
        {/* Animated Celebration Ring */}
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white flex items-center justify-center shadow-[0_8px_24px_rgba(16,185,129,0.35)] animate-bounce-subtle">
            <CheckCircle2 size={32} strokeWidth={2.4} />
          </div>
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 text-black flex items-center justify-center shadow-sm">
            <Sparkles size={12} strokeWidth={2.5} />
          </span>
        </div>

        {/* Title & Subtitle */}
        <div className="flex flex-col gap-1">
          <h3 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight">
            {t('allDoneTitle') || "You're All Done!"}
          </h3>
          <p className="text-xs text-[var(--text-secondary)] font-medium">
            {t('waitingFriendsSubtitle') || 'Waiting for your friends to finish swiping...'}
          </p>
        </div>

        {/* Group Progress Bar */}
        <div className="w-full flex flex-col gap-1.5 p-3 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)]">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-secondary)]">
            <span className="flex items-center gap-1.5">
              <span>{t('groupProgress') || 'Group Progress'}</span>
            </span>
            <span className="font-bold tabular-nums text-[var(--accent-bg)]">
              {votesText}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[var(--accent-bg)] to-emerald-400 transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Live Participant Roster (showing who is done vs voting) */}
        {participants && participants.length > 0 && (
          <div className="w-full flex flex-col gap-1.5 text-left">
            <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto no-scrollbar pr-0.5">
              {participants.map((p, idx) => {
                const isCurrent = p.id === currentParticipantId;
                const isDone = isCurrent || (Array.isArray(votedParticipantIds) && votedParticipantIds.includes(p.id));
                const initial = String(p.name || 'U').charAt(0).toUpperCase();

                return (
                  <div
                    key={p.id || `${idx}-${p.name}`}
                    className={`flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl border transition-all ${
                      isDone
                        ? 'bg-[var(--bg-surface)] border-emerald-500/20'
                        : 'bg-[var(--bg-inset)] border-[var(--border-subtle)]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        isDone
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-[var(--accent-bg)]/15 text-[var(--accent-bg)]'
                      }`}>
                        {initial}
                      </div>
                      <div className="flex items-center gap-1.5 min-w-0 truncate">
                        <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                          {p.name}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] text-[var(--text-tertiary)] font-normal">
                            (You)
                          </span>
                        )}
                        {p.isHost && (
                          <Crown size={12} className="text-amber-400 shrink-0" />
                        )}
                      </div>
                    </div>

                    {isDone ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                        <Check size={11} strokeWidth={2.5} />
                        <span>{t('voterStatusDone') || 'Done'}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse shrink-0">
                        <Clock size={11} />
                        <span>{t('voterStatusVoting') || 'Voting...'}</span>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action / Guidance Section */}
        {isHost ? (
          <div className="flex flex-col items-center gap-2 w-full pt-1">
            <Button
              variant="primary"
              size="md"
              onClick={handleHostForceReveal}
              className="w-full text-sm font-bold shadow-md rounded-2xl h-11"
            >
              {t('revealWinnerNow') || 'Reveal Winner Now'}
            </Button>
            <span className="text-[11px] text-[var(--text-tertiary)] text-center">
              {t('hostRevealHint') || 'Ready? You can reveal the top pick for everyone right away.'}
            </span>
          </div>
        ) : (
          <div className="p-3 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] w-full text-center font-medium leading-relaxed">
            {t('guestWaitingHint') || 'Sit tight! Once everyone finishes, the winning spot will reveal automatically.'}
          </div>
        )}
      </div>
    </main>
  );
}
