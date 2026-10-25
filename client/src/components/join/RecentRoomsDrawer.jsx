import React from 'react';
import { createPortal } from 'react-dom';
import {
  Clock,
  Star,
  MessageSquarePlus,
  ArrowRight,
  History,
  X,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { triggerHaptic } from '../../utils/haptics';

export default function RecentRoomsDrawer({
  recentSession,
  recentWinnerName = '',
  recentRating = null,
  activePin = '',
  historyList = [],
  isOpen = false,
  onClose,
  onOpenDrawer,
  onQuickRate,
  onOpenReviewModal,
  onNavigateHistory,
  onRejoinPin,
  onQuickSelectCategory,
}) {
  const { t } = useLanguage();

  return (
    <>
      {/* Active Room 1-Tap Rejoin Banner */}
      {activePin && /^\d{4}$/.test(activePin) && (
        <div className="w-full mt-2 px-3 py-2 rounded-2xl bg-[var(--accent-bg)]/10 border border-[var(--accent-bg)]/25 flex items-center justify-between gap-2 shadow-2xs shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs font-bold text-[var(--text-primary)] truncate">
              Active Room <span className="text-[var(--accent-bg)] tabular-nums">#{activePin}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('selection');
              onRejoinPin?.(activePin);
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[var(--accent-bg)] text-white text-xs font-bold hover:opacity-95 active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <span>Rejoin</span>
            <ArrowRight size={12} />
          </button>
        </div>
      )}

      {/* Post-Visit 1-Tap Return Check-In Banner / Recent Decision Shortcut */}
      {recentSession && (
        <div className="w-full mt-2 p-2.5 sm:p-3 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-main)] flex items-center justify-between gap-2 shadow-2xs shrink-0">
          {!recentRating ? (
            <>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-bg)]">
                  How did it go?
                </span>
                <span className="text-xs font-extrabold text-[var(--text-primary)] truncate">
                  Rate {recentWinnerName}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => onQuickRate?.(star)}
                    aria-label={`Rate ${recentWinnerName} ${star} stars`}
                    className="w-7 h-7 rounded-lg bg-[var(--bg-inset)] hover:bg-amber-500/15 border border-[var(--border-subtle)] flex items-center justify-center text-amber-400 hover:scale-110 active:scale-95 transition-all cursor-pointer"
                  >
                    <Star size={13} className="fill-amber-400 text-amber-400" />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('tap');
                    onOpenReviewModal?.();
                  }}
                  title="Leave a note"
                  aria-label="Leave a review note"
                  className="w-7 h-7 rounded-lg bg-[var(--bg-inset)] hover:bg-[var(--accent-bg)]/15 border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent-bg)] transition-colors cursor-pointer ml-0.5"
                >
                  <MessageSquarePlus size={13} />
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 min-w-0">
                <Clock size={14} className="text-[var(--text-tertiary)] shrink-0" />
                <div className="text-xs truncate flex items-center gap-1.5">
                  <span className="text-[var(--text-tertiary)]">{t('lastWinnerPrefix')}:</span>
                  <span className="font-bold text-[var(--text-primary)] truncate">
                    {recentWinnerName}
                  </span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-bold shrink-0 tabular-nums">
                    <Star size={10} className="fill-current shrink-0" />
                    <span>{recentRating}/5</span>
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                {historyList.length > 1 && onOpenDrawer && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('tap');
                      onOpenDrawer();
                    }}
                    className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    Recent ({historyList.length})
                  </button>
                )}
                <button
                  type="button"
                  onClick={onNavigateHistory}
                  className="text-xs font-semibold text-[var(--accent-bg)] hover:underline cursor-pointer shrink-0"
                >
                  {t('seeAll')}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Slide-Up Recent Rooms & Favorites Drawer */}
      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-xl bg-black/60 animate-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label="Recent Rooms and Favorites"
          >
            <div
              className="w-full sm:max-w-md max-h-[80dvh] bg-[var(--bg-elevated)] rounded-t-[32px] sm:rounded-3xl p-5 border border-[var(--border-glass)] shadow-2xl flex flex-col gap-3.5 text-[var(--text-primary)] animate-sheet-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-2.5 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[var(--accent-bg)]/10 text-[var(--accent-bg)] flex items-center justify-center">
                    <History size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold">Recent Group Picks</h3>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Tap a category to start a fresh room in 1 tap
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-[var(--bg-inset)] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] cursor-pointer"
                  aria-label="Close recent rooms drawer"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-0.5">
                {historyList.slice(0, 6).map((item, idx) => {
                  const winnerLabel =
                    typeof item.winner === 'object' && item.winner !== null
                      ? item.winner.name || item.winner.id || 'Group Pick'
                      : String(item.winner || 'Group Pick');
                  return (
                    <div
                      key={`${item.pin || idx}-${winnerLabel}`}
                      className="p-3 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)] flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <Sparkles size={12} className="text-[var(--accent-bg)] shrink-0" />
                          <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                            {winnerLabel}
                          </span>
                        </div>
                        <div className="text-[11px] text-[var(--text-tertiary)] truncate mt-0.5">
                          {item.topic || 'Group consensus'} {item.pin ? `(Room #${item.pin})` : ''}
                        </div>
                      </div>
                      {onQuickSelectCategory && (
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic('selection');
                            onClose?.();
                            onQuickSelectCategory(item);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--accent-bg)] hover:text-white border border-[var(--border-subtle)] text-[11px] font-bold text-[var(--accent-bg)] transition-colors cursor-pointer shrink-0"
                        >
                          <RotateCcw size={11} />
                          <span>Run again</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose?.();
                  onNavigateHistory?.();
                }}
                className="w-full py-2.5 rounded-xl bg-[var(--bg-inset)] hover:bg-[var(--bg-surface)] text-xs font-bold text-[var(--accent-bg)] transition-colors cursor-pointer"
              >
                {t('seeAll')}
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
