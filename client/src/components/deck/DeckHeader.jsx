import React from 'react';
import { ArrowLeft, Home, Info } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function DeckHeader({
  pin,
  showWinner,
  currentIndex,
  cardsLength,
  activeTab,
  setActiveTab,
  isConnected,
  progressPercent,
  onBackClick,
}) {
  const { t } = useLanguage();

  return (
    <header className="sticky top-0 z-30 bg-[var(--bg-root)] border-b border-[var(--border-main)] px-3.5 sm:px-4 safe-pt-header pb-2 relative shrink-0 select-none">
      <div className="grid grid-cols-3 items-center max-w-md mx-auto min-h-[40px]">
        {/* Left Slot: Lobby Back Action Pill */}
        <div className="flex items-center justify-start z-10">
          <button
            type="button"
            onClick={onBackClick}
            className="w-[84px] sm:w-[88px] h-8 flex items-center justify-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer py-1.5 px-3 rounded-full bg-[var(--bg-inset)] hover:bg-black/5 dark:hover:bg-white/5 border border-[var(--border-subtle)] shrink-0 active:scale-95 shadow-2xs"
            aria-label={showWinner ? t('home') : 'Back to Lobby or Leave'}
          >
            {showWinner ? <Home size={14} /> : <ArrowLeft size={14} />}
            <span>{showWinner ? t('home') : t('lobby')}</span>
          </button>
        </div>

        {/* Dead Center: Dominant Progress Badge (3 / 12) + Secondary PIN */}
        <div className="flex items-center justify-center z-10 pointer-events-none whitespace-nowrap">
          {!showWinner && currentIndex < cardsLength ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-main)] text-xs font-bold text-[var(--text-primary)] shadow-2xs tabular-nums">
              <span className="text-[var(--accent-bg)] font-black text-sm">{currentIndex + 1}</span>
              <span className="text-[var(--text-tertiary)] font-semibold">/ {cardsLength}</span>
              <span className="text-[var(--border-main)]">•</span>
              <span className="text-[var(--text-tertiary)] text-[11px] font-normal">#{pin}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-main)] text-xs font-bold text-[var(--text-primary)] shadow-2xs">
              <span className="text-[var(--text-tertiary)] font-normal">{t('roomPrefix') || 'Room'}</span>
              <span className="text-[var(--accent-bg)] tabular-nums">#{pin}</span>
            </div>
          )}
        </div>

        {/* Right Slot: Details Action Pill (Identical size & style to Lobby pill) */}
        <div className="flex items-center justify-end z-10">
          {!showWinner && currentIndex < cardsLength ? (
            <button
              type="button"
              onClick={() => setActiveTab?.(activeTab === 'details' ? 'swipe' : 'details')}
              className={`w-[84px] sm:w-[88px] h-8 flex items-center justify-center gap-1.5 text-xs font-semibold transition-all cursor-pointer py-1.5 px-3 rounded-full border shrink-0 active:scale-95 shadow-2xs ${
                activeTab === 'details'
                  ? 'bg-[var(--accent-bg)] text-white border-transparent'
                  : 'bg-[var(--bg-inset)] hover:bg-black/5 dark:hover:bg-white/5 border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              title="Toggle venue details (D)"
              aria-label="Toggle venue details"
            >
              <Info size={14} className={activeTab === 'details' ? 'text-white' : 'text-[var(--accent-bg)]'} />
              <span>{t('details') || 'Details'}</span>
            </button>
          ) : (
            <div className="w-[84px] sm:w-[88px]" />
          )}
        </div>
      </div>

      {/* Reconnection notification */}
      {!isConnected && (
        <div className="bg-amber-500/15 border border-amber-500/25 rounded-xl px-3 py-1 text-center flex items-center justify-center gap-2 text-[11px] font-semibold text-amber-600 dark:text-amber-400 mt-2 max-w-md mx-auto">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
          <span>{t('reconnecting')}</span>
        </div>
      )}

      {/* Flush Hairline Progress Edge */}
      {!showWinner && currentIndex < cardsLength && (
        <div className="absolute bottom-0 inset-x-0 h-[2.5px] bg-[var(--border-subtle)] overflow-hidden pointer-events-none">
          <div
            className="h-full bg-[var(--accent-bg)] transition-all duration-300 shadow-[0_0_8px_var(--accent-glow)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}
    </header>
  );
}
