import React from 'react';
import { Users, ShieldCheck, Share2, Crown, QrCode } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { triggerHaptic } from '../../utils/haptics';

function getLocalizedTopic(rawTopic, t) {
  if (!rawTopic) return t('catCustomTopic');
  const lower = String(rawTopic).toLowerCase().trim();
  if (lower === 'cafes' || lower === 'cafe' || lower === 'coffee') return t('catCafesTopic');
  if (lower === 'restaurants' || lower === 'restaurant') return t('catRestaurantsTopic');
  if (lower === 'bars' || lower === 'bar') return t('catBarsTopic');
  if (lower === 'cinema' || lower === 'movies') return t('catCinemaTopic');
  if (lower === 'desserts' || lower === 'dessert') return t('catDessertsTopic');
  if (lower === 'custom' || lower === 'poll' || lower === 'places nearby') return t('catCustomTopic');
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
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
        <div className="flex flex-col text-left min-w-0">
          <h2 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight leading-snug">
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

      {/* Friends Roster */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)]">
          <Users size={14} className="text-[var(--accent-bg)]" />
          <span>{t('inRoomPrefix')} ({participants.length}):</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {participants.map((p, idx) => (
            <div
              key={p.id || idx}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--bg-inset)] border border-[var(--border-subtle)]"
            >
              <div className="w-4 h-4 rounded-full bg-[var(--accent-bg)] text-white text-[10px] font-bold flex items-center justify-center">
                {(p.name || 'P').charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-medium text-[var(--text-primary)]">
                {p.name}
              </span>
              {p.isHost && (
                <Crown size={11} className="text-amber-500 fill-amber-500" title={t('hostBadge')} />
              )}
              {p.budgetSealed && (
                <ShieldCheck size={12} className="text-emerald-500 shrink-0" title="Price filter set" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
