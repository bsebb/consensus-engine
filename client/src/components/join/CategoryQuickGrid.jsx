import React from 'react';
import { ArrowRight, ListPlus, MapPin, Zap } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { triggerHaptic, hapticTrigger } from '../../utils/haptics';
import Button from '../ui/Button';

export default function CategoryQuickGrid({
  categories = [],
  selectedCategory,
  onSelectCategory,
  favoriteCategory,
  customTopic = '',
  customOptions = [],
  onOpenCustomDrawer,
  gpsState,
  onOpenLocationModal,
  onStartRoom,
  isCreatingRoom = false,
  hasSavedNickname = false,
}) {
  const { t } = useLanguage();
  const isCustomMode = selectedCategory === 'Custom';

  const handleTileClick = (cat) => {
    const isCustom = cat.id === 'Custom';
    triggerHaptic('tap');

    onSelectCategory(cat.id);
    if (isCustom) {
      onOpenCustomDrawer?.();
    }
  };

  return (
    <div className="flex flex-col gap-2.5 sm:gap-3.5 md:gap-4">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between px-1 h-[18px]">
          <span className="text-xs font-semibold text-[var(--text-secondary)]">
            {t('whatPicking')}
          </span>
          {hasSavedNickname && !isCustomMode && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--accent-bg)]">
              <Zap size={11} className="fill-current" />
              <span>{t('oneTapReady') || '1-tap ready'}</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-2.5 md:gap-3">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            const isFav = favoriteCategory && favoriteCategory === cat.id && cat.id !== 'Custom';
            const tileTitle = cat.title;
            const tileDesc = cat.desc;

            return (
              <button
                key={cat.id}
                ref={hapticTrigger}
                type="button"
                data-theme={cat.theme}
                onClick={() => handleTileClick(cat)}
                className={`category-tile relative flex items-center gap-2 sm:gap-2.5 px-2.5 sm:px-3 h-[48px] sm:h-[54px] md:h-[60px] rounded-2xl border text-left cursor-pointer touch-manipulation hover:scale-[1.01] active:scale-[0.98] ${
                  cat.wide ? 'col-span-2 md:col-span-1' : 'col-span-1'
                } ${
                  isSelected
                    ? 'is-selected text-[var(--text-primary)] shadow-xs ring-1 ring-black/5 dark:ring-white/10'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-inset)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-main)]'
                }`}
              >
                <div
                  className={`cat-icon-badge w-7 h-7 md:w-8 md:h-8 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                    isSelected
                      ? 'is-selected scale-105'
                      : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
                  }`}
                >
                  <Icon size={15} />
                </div>
                <div className="min-w-0 flex-1 pr-1 overflow-hidden">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-[13px] md:text-sm font-bold text-[var(--text-primary)] leading-tight truncate" title={tileTitle}>
                      {tileTitle}
                    </span>
                    {isFav && !isSelected && (
                      <span className="px-1.5 py-0.5 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[10px] font-semibold text-[var(--text-tertiary)] shrink-0">
                        {t('recentBadge') || 'Recent'}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] sm:text-[11px] md:text-xs text-[var(--text-tertiary)] leading-tight mt-0.5 truncate" title={tileDesc}>
                    {tileDesc}
                  </div>
                </div>
                <div
                  className={`cat-indicator-dot absolute top-2 right-2 w-1.5 h-1.5 rounded-full pointer-events-none ${
                    isSelected ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-2.5 md:gap-3 items-stretch">
        <div className="md:col-span-2 min-w-0">
          {/* Universal Hex Grid Location Bar or Custom Poll Config Summary Bar */}
          {isCustomMode ? (
            <div
              onClick={() => {
                triggerHaptic('tap');
                onOpenCustomDrawer?.();
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  triggerHaptic('tap');
                  onOpenCustomDrawer?.();
                }
              }}
              className="h-[48px] sm:h-[52px] md:h-[54px] flex items-center justify-between gap-2 px-2.5 sm:px-3.5 rounded-2xl bg-[var(--bg-inset)] hover:bg-[var(--bg-inset)]/80 border border-[var(--border-subtle)] hover:border-[var(--border-main)] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-xl bg-[var(--accent-bg)]/10 text-[var(--accent-bg)] flex items-center justify-center shrink-0">
                  <ListPlus size={15} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-bold text-[var(--text-primary)] leading-tight truncate group-hover:text-[var(--accent-bg)] transition-colors">
                    {customTopic.trim() ? customTopic.trim() : t('catCustomTopic')}
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-[var(--text-tertiary)] leading-tight mt-0.5 truncate">
                    {customOptions.length > 0
                      ? `${customOptions.length} ${t('optionsSuffix') || 'options'} ready - Tap to edit`
                      : (t('configureQuestionHint') || 'Configure question & options')}
                  </div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--accent-bg)] group-hover:bg-[var(--accent-bg)] group-hover:text-white transition-all shrink-0">
                {customOptions.length > 0 ? (t('change') || 'Edit') : (t('customAddBtn') || 'Setup')}
              </span>
            </div>
          ) : (
            <div
              onClick={() => {
                triggerHaptic('tap');
                onOpenLocationModal?.();
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  triggerHaptic('tap');
                  onOpenLocationModal?.();
                }
              }}
              className="h-[48px] sm:h-[52px] md:h-[54px] flex items-center justify-between gap-2 px-2.5 sm:px-3.5 rounded-2xl bg-[var(--bg-inset)] hover:bg-[var(--bg-inset)]/80 border border-[var(--border-subtle)] hover:border-[var(--border-main)] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-xl bg-[var(--accent-bg)]/10 text-[var(--accent-bg)] flex items-center justify-center shrink-0">
                  <MapPin size={15} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-bold text-[var(--text-primary)] leading-tight truncate group-hover:text-[var(--accent-bg)] transition-colors">
                    {gpsState?.label || t('detectingLocation')}
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-[var(--text-tertiary)] leading-tight mt-0.5 truncate">
                    {gpsState?.source === 'gps' ? t('locationLabel') : t('locationChangeHint')}
                  </div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--accent-bg)] group-hover:bg-[var(--accent-bg)] group-hover:text-white transition-all shrink-0">
                {t('change')}
              </span>
            </div>
          )}
        </div>

        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={onStartRoom}
          disabled={isCreatingRoom}
          loading={isCreatingRoom}
          icon={ArrowRight}
          className="md:col-span-1 w-full h-[48px] sm:h-[52px] md:h-[54px] py-0 rounded-2xl font-bold text-sm sm:text-base shadow-[0_6px_20px_var(--accent-glow)] shrink-0"
        >
          {isCustomMode && (!customTopic.trim() || customOptions.length < 2)
            ? (t('customConfigureBtn') || 'Configure Poll & Start')
            : t('createRoomBtn')}
        </Button>
      </div>
    </div>
  );
}
