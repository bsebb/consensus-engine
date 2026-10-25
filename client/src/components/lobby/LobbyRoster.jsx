import React from 'react';
import { ShieldCheck, Share2, Crown, QrCode, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { triggerHaptic } from '../../utils/haptics';

function getLocalizedTopic(rawTopic, t) {
  if (!rawTopic) return t('catCustomTopic');
  const lower = String(rawTopic).toLowerCase().trim();
  if (lower.includes('cafe') || lower.includes('coffee') || lower.includes('cafes') || lower.includes('кофе') || lower.includes('кафе')) return t('catCafesTopic');
  if (lower.includes('restaurant') || lower.includes('dining') || lower.includes('mâncăm') || lower.includes('поедим') || lower.includes('ресторан')) return t('catRestaurantsTopic');
  if (lower.includes('bar') || lower.includes('pub') || lower.includes('drink') || lower.includes('pahar') || lower.includes('băutură') || lower.includes('выпить') || lower.includes('бар')) return t('catBarsTopic');
  if (lower.includes('fun') || lower.includes('distraction') || lower.includes('activit') || lower.includes('distracție') || lower.includes('развлеч')) return t('catFunTopic') || rawTopic;
  if (lower.includes('cinema') || lower.includes('movie') || lower.includes('film') || lower.includes('кино')) return t('catCinemaTopic');
  if (lower.includes('dessert') || lower.includes('gelato') || lower.includes('sweet') || lower.includes('dulciuri') || lower.includes('dulce') || lower.includes('desert') || lower.includes('сладк') || lower.includes('десерт')) return t('catDessertsTopic');
  if (lower === 'custom' || lower === 'poll' || lower === 'places nearby' || lower.includes('what should we do') || lower.includes('ce facem') || lower.includes('что будем делать')) return t('catCustomTopic');
  return rawTopic;
}

export default function LobbyRoster({
  topic,
  participants = [],
  candidateCount = 0,
  handleShareInvite,
  setQrModalOpen,
}) {
  const { t } = useLanguage();

  const onShare = (e) => {
    triggerHaptic('selection');
    handleShareInvite?.(e);
  };

  const onQr = () => {
    triggerHaptic('selection');
    setQrModalOpen?.(true);
  };

  const displayTopic = getLocalizedTopic(topic, t);
  const sealedCount = participants.filter((p) => p.budgetSealed).length;
  const isDeckReady = candidateCount >= 2;

  return (
    <section className="shrink-0 p-3.5 sm:p-4 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-main)] flex flex-col gap-2.5 shadow-2xs">
      {/* Topic & Invite Bar */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--border-subtle)]">
        <div className="flex flex-col text-left min-w-0 flex-1">
          <h2 className="text-lg sm:text-xl font-black text-[var(--text-primary)] tracking-tight leading-snug flex items-center">
            {displayTopic}
          </h2>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onQr}
            className="w-8.5 h-8.5 rounded-full bg-[var(--bg-inset)] hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] transition-all cursor-pointer active:scale-[0.95]"
            title={t('shareQr')}
            aria-label={t('shareQr')}
          >
            <QrCode size={14} />
          </button>
          <button
            type="button"
            onClick={onShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--accent-bg)] text-white hover:opacity-90 text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-[0.95]"
            title={t('inviteFriends')}
            aria-label={t('inviteFriends')}
          >
            <Share2 size={12} />
            <span>{t('inviteFriends')}</span>
          </button>
        </div>
      </div>

      {/* Live Collaboration Friends & Readiness Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 min-w-0">
          <div className="flex items-center -space-x-1.5 shrink-0">
            {participants.map((p, idx) => (
              <div
                key={p.id || idx}
                className="relative w-7 h-7 rounded-full bg-[var(--accent-bg)] text-white text-[11px] font-bold flex items-center justify-center ring-2 ring-[var(--bg-elevated)] shadow-2xs"
                title={`${p.name || 'P'} ${p.isHost ? `(${t('hostBadge')})` : ''}`}
              >
                {(p.name || 'P').charAt(0).toUpperCase()}
                {p.isHost && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-400 text-black flex items-center justify-center shadow-2xs">
                    <Crown size={8} className="fill-black text-black" />
                  </span>
                )}
                {p.budgetSealed && !p.isHost && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-2xs">
                    <ShieldCheck size={8} />
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-1 min-w-0 truncate">
            {participants.map((p, idx) => (
              <span
                key={p.id || idx}
                className="text-xs font-semibold text-[var(--text-primary)] truncate"
              >
                {p.name}{idx < participants.length - 1 ? ',' : ''}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {sealedCount > 0 && (
            <span
              className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/12 border border-emerald-500/25 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums"
              title="Price filter active"
            >
              <ShieldCheck size={10} />
              <span>{sealedCount}</span>
            </span>
          )}
          <div
            data-testid="participant-readiness-pill"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold transition-colors ${
              isDeckReady
                ? 'bg-emerald-500/12 border-emerald-500/25 text-emerald-700 dark:text-emerald-300'
                : 'bg-[var(--bg-inset)] border-[var(--border-subtle)] text-[var(--text-secondary)]'
            }`}
          >
            {isDeckReady ? (
              <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            )}
            <span className="tabular-nums">
              {participants.length} {t('inRoomPrefix')}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
