import React from 'react';
import { ArrowRight, ListPlus, MapPin, Zap } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { triggerHaptic } from '../../utils/haptics';
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
    const isAlreadySelected = selectedCategory === cat.id;
    const isCustom = cat.id === 'Custom';
    triggerHaptic('tap');

    if (isCustom) {
      onSelectCategory(cat.id);
      onOpenCustomDrawer?.();
      return;
    }

    onSelectCategory(cat.id);
    if (isAlreadySelected && !isCreatingRoom) {
      onStartRoom?.();
    }
  };

  return (
    <div className="flex flex-col gap-2.5 sm:gap-3.5">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold text-[var(--text-secondary)]">
            {t('whatPicking')}
          </span>
          {hasSavedNickname && !isCustomMode && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--accent-bg)]">
              <Zap size={11} className="fill-current" />
              <span>1-tap ready</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            const isFav = favoriteCategory && favoriteCategory === cat.id && cat.id !== 'Custom';
            const tileTitle = cat.title;
            const tileDesc = cat.desc;

            return (
              <button
                key={cat.id}
                type="button"
                data-theme={cat.theme}
                onClick={() => handleTileClick(cat)}
                className={`category-tile relative flex items-center gap-2.5 p-2.5 sm:p-3 rounded-2xl border text-left cursor-pointer min-h-[50px] sm:min-h-[58px] touch-manipulation hover:scale-[1.01] active:scale-[0.98] ${
                  cat.wide ? 'col-span-2' : 'col-span-1'
                } ${
                  isSelected
                    ? 'is-selected text-[var(--text-primary)] shadow-xs ring-1 ring-black/5 dark:ring-white/10'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-inset)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-main)]'
                }`}
              >
                <div
                  className={`cat-icon-badge w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                    isSelected
                      ? 'is-selected scale-105'
                      : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
                  }`}
                >
                  <Icon size={15} />
                </div>
                <div className="min-w-0 flex-1 pr-1 overflow-hidden">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-[13px] font-bold text-[var(--text-primary)] leading-tight truncate" title={tileTitle}>
                      {tileTitle}
                    </span>
                    {isFav && !isSelected && (
                      <span className="px-1.5 py-0.5 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[10px] font-semibold text-[var(--text-tertiary)] shrink-0">
                        Recent
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[var(--text-tertiary)] leading-tight mt-0.5 truncate" title={tileDesc}>
                    {tileDesc}
                  </div>
                </div>
                <div
                  className={`cat-indicator-dot absolute top-2.5 right-2.5 w-2 h-2 rounded-full pointer-events-none ${
                    isSelected ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

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
          className="flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-2xl bg-[var(--bg-inset)] hover:bg-[var(--bg-inset)]/80 border border-[var(--border-subtle)] hover:border-[var(--border-main)] transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[var(--accent-bg)]/10 text-[var(--accent-bg)] flex items-center justify-center shrink-0">
              <ListPlus size={15} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--accent-bg)] transition-colors">
                {customTopic.trim() ? customTopic.trim() : t('catCustomTopic')}
              </div>
              <div className="text-[11px] text-[var(--text-tertiary)] truncate">
                {customOptions.length > 0
                  ? `${customOptions.length} ${t('optionsSuffix') || 'options'} ready - Tap to edit`
                  : 'Configure question & options'}
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
          className="flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-2xl bg-[var(--bg-inset)] hover:bg-[var(--bg-inset)]/80 border border-[var(--border-subtle)] hover:border-[var(--border-main)] transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[var(--accent-bg)]/10 text-[var(--accent-bg)] flex items-center justify-center shrink-0">
              <MapPin size={15} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--accent-bg)] transition-colors">
                {gpsState?.label || t('detectingLocation')}
              </div>
              <div className="text-[11px] text-[var(--text-tertiary)] truncate">
                {gpsState?.source === 'gps' ? t('locationLabel') : t('locationChangeHint')}
              </div>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--accent-bg)] group-hover:bg-[var(--accent-bg)] group-hover:text-white transition-all shrink-0">
            {t('change')}
          </span>
        </div>
      )}

      <Button
        type="button"
        variant="primary"
        size="md"
        onClick={onStartRoom}
        disabled={isCreatingRoom}
        loading={isCreatingRoom}
        icon={ArrowRight}
        className="w-full h-11 sm:h-12 rounded-2xl font-bold text-base shadow-[0_6px_20px_var(--accent-glow)] mt-0.5"
      >
        {isCustomMode && (!customTopic.trim() || customOptions.length < 2)
          ? (t('customConfigureBtn') || 'Configure Poll & Start')
          : t('createRoomBtn')}
      </Button>
    </div>
  );
}
