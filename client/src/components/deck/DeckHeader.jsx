import React from 'react';
import { ArrowLeft, Home, Layers, MapPin } from 'lucide-react';
import ThemeToggle from '../ThemeToggle';
import SegmentedControl from '../ui/SegmentedControl';
import { useLanguage } from '../../context/LanguageContext';

export default function DeckHeader({
  pin,
  showWinner,
  currentIndex,
  cardsLength,
  mode,
  activeCard,
  activeTab,
  setActiveTab,
  isConnected,
  progressPercent,
  onBackClick,
}) {
  const { t } = useLanguage();

  return (
    <header className="sticky top-0 z-30 bg-[var(--bg-root)] border-b border-[var(--border-main)] px-4 safe-pt-header pb-2.5 relative shrink-0 select-none">
      <div className="relative flex items-center justify-between gap-2 max-w-md mx-auto min-h-[36px]">
        <div className="flex items-center z-10">
          <button
            type="button"
            onClick={onBackClick}
            className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer py-1.5 px-3 rounded-full bg-[var(--bg-inset)] hover:bg-black/5 dark:hover:bg-white/5 border border-[var(--border-subtle)] shrink-0 active:scale-[0.96]"
            aria-label={showWinner ? t('home') : 'Back to Lobby or Leave'}
          >
            {showWinner ? <Home size={14} /> : <ArrowLeft size={14} />}
            <span>{showWinner ? t('home') : t('lobby')}</span>
          </button>
        </div>

        {/* Segmented Tab Switcher or Status Pill - Dead Centered */}
        <div className="flex-1 min-w-0 flex items-center justify-center z-10 pointer-events-auto">
          {!showWinner && currentIndex < cardsLength ? (
            <div className="w-full max-w-[210px]">
              <SegmentedControl
                options={[
                  { value: 'swipe', label: `${t('card')} ${Math.min(currentIndex + 1, cardsLength)}/${cardsLength}`, icon: Layers },
                  { value: 'details', label: t('details'), icon: MapPin },
                ]}
                value={activeTab}
                onChange={setActiveTab}
                size="sm"
                variant="accent"
              />
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--bg-inset)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-primary)] shadow-2xs">
              <span className="text-[var(--text-tertiary)] font-normal">{t('roomPrefix')}</span>
              <span className="text-[var(--accent-bg)] tabular-nums">#{pin}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 z-10">
          <ThemeToggle />
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
        <div className="absolute bottom-0 inset-x-0 h-[2px] bg-transparent overflow-hidden pointer-events-none">
          <div
            className="h-full bg-[var(--accent-bg)] transition-all duration-300 shadow-[0_0_8px_var(--accent-glow)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}
    </header>
  );
}
