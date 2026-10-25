import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutGrid, PlusCircle, ShieldCheck, Plus, Shuffle, Sparkles, CheckCircle2,
} from 'lucide-react';
import VenueDetailsModal from '../deck/VenueDetailsModal';
import CustomOptionAutocomplete from './CustomOptionAutocomplete';
import { CandidatePoolCard, CustomOptionCard } from './CandidatePoolCards';
import { useLanguage } from '../../context/LanguageContext';
import { triggerHaptic } from '../../utils/haptics';

export default function CandidatePoolDeck({
  mode,
  topic = '',
  category = '',
  extraPoolOptions = [],
  candidates = [],
  remainingPoolCount = 0,
  isLoading = false,
  lockedConstraint,
  prunedCount,
  suggestion,
  setSuggestion,
  handleAddSuggestion,
  handleQuickAddSuggestion,
  handleRemoveSuggestion,
  handleAddNextPlace,
  handleRemovePlace,
  duplicateMatch,
  recentlyAddedName = null,
  onShuffle,
  onReportClosed,
}) {
  const { t } = useLanguage();
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [isShuffling, setIsShuffling] = useState(false);
  const [localAddedName, setLocalAddedName] = useState(null);
  const railRef = useRef(null);

  const activeHighlightName = recentlyAddedName || localAddedName;

  useEffect(() => {
    if (!recentlyAddedName) return;
    if (mode !== 'CUSTOM' && railRef.current) {
      setTimeout(() => {
        railRef.current?.scrollTo?.({ left: 0, behavior: 'smooth' });
      }, 60);
    }
  }, [recentlyAddedName, mode]);

  const handleShuffleClick = () => {
    triggerHaptic('selection');
    setIsShuffling(true);
    onShuffle?.();
    setTimeout(() => setIsShuffling(false), 500);
  };

  const handleOptionAddedToRail = (addedText) => {
    if (addedText) {
      setLocalAddedName(addedText);
      setTimeout(() => setLocalAddedName(null), 4000);
    }
    if (mode !== 'CUSTOM' && railRef.current) {
      setTimeout(() => {
        railRef.current?.scrollTo?.({ left: 0, behavior: 'smooth' });
      }, 60);
    }
  };

  return (
    <section className="min-w-0 shrink-0 p-3.5 sm:p-5 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-main)] flex flex-col gap-3.5 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2">
        <div className="flex items-center gap-2 min-w-0">
          <LayoutGrid size={16} className="text-[var(--accent-bg)] shrink-0" />
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            {mode === 'CUSTOM' ? t('optionsOnTable') : t('placesOnTable')}
          </h3>
          <span
            key={`count-pill-${candidates.length}`}
            className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold tabular-nums bg-[var(--accent-bg)]/12 text-[var(--accent-bg)] border border-[var(--accent-bg)]/20 animate-count-bounce shrink-0"
            title={`${candidates.length} ${mode === 'CUSTOM' ? t('optionsOnTable') : t('placesOnTable')}`}
          >
            {candidates.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onShuffle && candidates.length > 1 && (
            <button
              type="button"
              onClick={handleShuffleClick}
              className="flex items-center gap-1 px-2 py-1 sm:px-2.5 rounded-full bg-[var(--bg-inset)] hover:bg-black/5 dark:hover:bg-white/5 border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer active:scale-[0.98]"
              title={t('findDifferent')}
              aria-label={t('findDifferent')}
            >
              <Shuffle size={12} className={`text-[var(--accent-bg)] shrink-0 ${isShuffling ? 'rotate-180 transition-transform duration-500' : ''}`} />
              <span className="hidden sm:inline">{t('findDifferent')}</span>
            </button>
          )}

          {mode !== 'CUSTOM' && handleAddNextPlace && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('tap');
                  handleAddNextPlace(1);
                }}
                disabled={remainingPoolCount <= 0}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent-bg)] hover:brightness-110 text-white text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-2xs disabled:opacity-40 disabled:pointer-events-none touch-manipulation"
                title="Add next venue from pool"
              >
                <Plus size={13} strokeWidth={2.5} />
                <span>{t('addPlace')}</span>
              </button>

              {remainingPoolCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('like');
                    handleAddNextPlace(remainingPoolCount <= 3 ? remainingPoolCount : 3);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--bg-inset)] hover:bg-[var(--accent-bg)]/15 border border-[var(--border-subtle)] text-[11px] font-bold text-[var(--accent-bg)] transition-all cursor-pointer active:scale-95 touch-manipulation shadow-2xs"
                  title={`Add ${remainingPoolCount <= 3 ? `all ${remainingPoolCount}` : '3'} venues to table`}
                >
                  <span>+{remainingPoolCount <= 3 ? `${remainingPoolCount} All` : '3 All'}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {lockedConstraint && prunedCount > 0 && mode !== 'CUSTOM' && (
        <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 font-medium">
          <div className="flex items-center gap-2">
            <ShieldCheck size={15} className="text-amber-500 shrink-0" />
            <span>{prunedCount} {t('spotsFilteredNotice')}</span>
          </div>
          <span className="text-[11px] font-semibold text-amber-500 bg-amber-500/15 px-2 py-0.5 rounded-full">
            {t('filteredBadge')}
          </span>
        </div>
      )}

      {handleAddSuggestion && (
        <div className="pt-0.5 pb-1">
          <CustomOptionAutocomplete
            suggestion={suggestion}
            setSuggestion={setSuggestion}
            handleAddSuggestion={handleAddSuggestion}
            handleQuickAddSuggestion={handleQuickAddSuggestion}
            topic={topic}
            category={category}
            extraPoolOptions={extraPoolOptions}
            existingNames={candidates.map((c) => c.name)}
            duplicateMatch={duplicateMatch}
            mode={mode}
            disabled={mode === 'CUSTOM' ? candidates.length >= 16 : false}
            onOptionAdded={handleOptionAddedToRail}
          />
        </div>
      )}

      {activeHighlightName && (
        <div
          data-testid="instant-added-feedback"
          className="flex items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-emerald-500/12 border border-emerald-500/30 text-xs font-semibold text-emerald-700 dark:text-emerald-300 animate-scale-up"
        >
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
            <span className="truncate">
              Added <span className="font-extrabold">"{activeHighlightName}"</span> to the top of the deck
            </span>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold shrink-0">
            <Sparkles size={9} />
            <span>Group Pick</span>
          </span>
        </div>
      )}

      <div
        ref={railRef}
        className={mode === 'CUSTOM' || (!isLoading && candidates.length === 0) ? 'grid grid-cols-2 gap-3' : 'places-rail'}
        aria-label={mode === 'CUSTOM' ? t('optionsOnTable') : t('placesOnTable')}
        tabIndex={mode !== 'CUSTOM' ? 0 : undefined}
        onKeyDown={(event) => {
          if (mode === 'CUSTOM' || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
          event.preventDefault();
          event.stopPropagation();
          event.currentTarget.scrollBy({ left: (event.key === 'ArrowRight' ? 1 : -1) * event.currentTarget.clientWidth * 0.8, behavior: 'smooth' });
        }}
      >
        {isLoading ? (
          [0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={`skel-${i}`}
              className="rounded-2xl overflow-hidden bg-[var(--bg-inset)] border border-[var(--border-subtle)] flex flex-col justify-between shadow-2xs text-left animate-pulse"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="relative aspect-[16/10] w-full bg-zinc-200/60 dark:bg-zinc-800/60 flex flex-col justify-between p-2.5">
                <div className="flex items-center justify-between">
                  <div className="h-4 w-12 rounded-full bg-white/40 dark:bg-white/10" />
                  <div className="h-4 w-7 rounded-full bg-white/40 dark:bg-white/10" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-3.5 bg-white/60 dark:bg-white/20 rounded-md w-3/4" />
                  <div className="h-2.5 bg-white/40 dark:bg-white/10 rounded-md w-1/2" />
                </div>
              </div>
              <div className="p-3 flex flex-col gap-1.5 flex-1 justify-between min-h-[96px]">
                <div className="space-y-1.5">
                  <div className="h-3 bg-zinc-300/70 dark:bg-zinc-700/60 rounded-md w-4/5" />
                  <div className="h-2.5 bg-zinc-200/80 dark:bg-zinc-800/80 rounded-md w-1/2" />
                </div>
              </div>
            </div>
          ))
        ) : candidates.length === 0 ? (
          <div className="col-span-2 p-6 rounded-2xl bg-[var(--bg-inset)] border border-dashed border-[var(--border-main)] text-center flex flex-col items-center gap-2">
            <PlusCircle size={24} className="text-[var(--text-tertiary)]" />
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              {mode === 'CUSTOM' ? t('emptyCustomTitle') : t('emptyFilterTitle')}
            </span>
            <span className="text-[11px] text-[var(--text-tertiary)] max-w-xs">
              {mode === 'CUSTOM' ? t('emptyCustomDesc') : t('emptyFilterDesc')}
            </span>
          </div>
        ) : (
          candidates.map((item, idx) => {
            const isNewlyAdded = Boolean(
              activeHighlightName &&
              (String(item.name || '').toLowerCase().includes(activeHighlightName.toLowerCase()) ||
                String(item.originalName || '').toLowerCase() === activeHighlightName.toLowerCase())
            );
            return mode === 'CUSTOM' || item.isCustom ? (
              <CustomOptionCard
                key={item.id || item.name || idx}
                item={item}
                idx={idx}
                topic={topic}
                handleRemoveSuggestion={handleRemoveSuggestion}
                isShuffling={isShuffling}
                isNewlyAdded={isNewlyAdded}
                onSelectDetails={setSelectedVenue}
              />
            ) : (
              <CandidatePoolCard
                key={item.id || item.name || idx}
                item={item}
                idx={idx}
                onSelectDetails={setSelectedVenue}
                onRemoveVenue={handleRemovePlace}
                isShuffling={isShuffling}
                isNewlyAdded={isNewlyAdded}
              />
            );
          })
        )}
      </div>

      <VenueDetailsModal
        key={selectedVenue?.id || selectedVenue?.name || 'lobby-venue-modal'}
        venue={selectedVenue}
        isOpen={Boolean(selectedVenue && (!selectedVenue.isCustom || selectedVenue.isRoutablePlace || mode !== 'CUSTOM'))}
        onClose={() => setSelectedVenue(null)}
        onReportClosed={(v) => {
          setSelectedVenue(null);
          onReportClosed?.(v);
        }}
      />
    </section>
  );
}
