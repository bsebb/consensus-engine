import React from 'react';
import { Users, ShieldCheck, Share2, Crown, QrCode } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { triggerHaptic } from '../../utils/haptics';

function getLocalizedTopic(rawTopic, t) {
  if (!rawTopic) return t('catCustomTopic');
  const lower = String(rawTopic).toLowerCase().trim();
  if (lower.includes('cafe') || lower.includes('coffee') || lower.includes('cafes') || lower.includes('кофе') || lower.includes('кафе')) return t('catCafesTopic');
  if (lower.includes('restaurant') || lower.includes('dining') || lower.includes('mâncăm') || lower.includes('поедим') || lower.includes('ресторан')) return t('catRestaurantsTopic');
  if (lower.includes('bar') || lower.includes('pub') || lower.includes('drink') || lower.includes('pahar') || lower.includes('băutură') || lower.includes('выпить') || lower.includes('бар')) return t('catBarsTopic');
  if (lower.includes('cinema') || lower.includes('movie') || lower.includes('film') || lower.includes('кино')) return t('catCinemaTopic');
  if (lower.includes('dessert') || lower.includes('gelato') || lower.includes('sweet') || lower.includes('dulciuri') || lower.includes('dulce') || lower.includes('desert') || lower.includes('сладк') || lower.includes('десерт')) return t('catDessertsTopic');
  if (lower === 'custom' || lower === 'poll' || lower === 'places nearby' || lower.includes('what should we do') || lower.includes('ce facem') || lower.includes('что будем делать')) return t('catCustomTopic');
  return rawTopic;
}

export default function LobbyRoster({
  topic,
  participants = [],
  handleShareInvite,
  setQrModalOpen,
}) {
  const { t } = useLanguage();

  const onShare = (e) => {
    triggerHaptic('selection');
    handleShareInvite?.(e);
  };

  const onQr = (e) => {
    triggerHaptic('selection');
    setQrModalOpen?.(true);
  };

  const displayTopic = getLocalizedTopic(topic, t);

  return (
    <section className="p-4 sm:p-5 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-main)] flex flex-col gap-3.5 shadow-2xs">
      {/* Topic & Invite Bar */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)] min-h-[4.25rem]">
        <div className="flex flex-col text-left min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight leading-snug min-h-[3.25rem] flex items-center">
            {displayTopic}
          </h2>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onQr}
            className="w-9 h-9 rounded-full bg-[var(--bg-inset)] hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] transition-all cursor-pointer active:scale-[0.95]"
            title={t('shareQr')}
            aria-label={t('shareQr')}
          >
            <QrCode size={15} />
          </button>
          <button
            type="button"
            onClick={onShare}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[var(--accent-bg)] text-white hover:opacity-90 text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-[0.95]"
            title={t('inviteFriends')}
          >
            <Share2 size={13} />
            <span>{t('inviteFriends')}</span>
          </button>
        </div>
      </div>

      {/* Live Collaboration Friends Bar */}
      <div className="flex items-center justify-between gap-3 pt-0.5">
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

        <div className="flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-full bg-[var(--bg-inset)] border border-[var(--border-subtle)] text-[11px] font-semibold text-[var(--text-secondary)]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="tabular-nums">{participants.length} {t('inRoomPrefix')}</span>
        </div>
      </div>
    </section>
  );
}
