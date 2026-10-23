import React, { useState } from 'react';
import {
  LayoutGrid,
  PlusCircle,
  ShieldCheck,
  Plus,
  Trash2,
  MapPin,
  Star,
  Shuffle,
  X,
} from 'lucide-react';
import VenueDetailsModal from '../deck/VenueDetailsModal';
import CustomOptionAutocomplete from './CustomOptionAutocomplete';
import { getVenueVibe, getVenueRating, useVenuePhotos } from '../../utils/venueImages';
import { formatTravelSummary } from '../../utils/location';
import { useLanguage } from '../../context/LanguageContext';
import { triggerHaptic } from '../../utils/haptics';

function CustomOptionCard({ item, idx, topic, handleRemoveSuggestion, isShuffling }) {
  const animClass = isShuffling
    ? (idx % 2 === 0 ? 'animate-shuffle-deck' : 'animate-shuffle-deck-alt')
    : 'animate-slide-up';

  return (
    <div
      data-testid="candidate-card"
      style={{ animationDelay: isShuffling ? `${(idx % 6) * 35}ms` : `${(idx % 8) * 45}ms` }}
      className={`relative rounded-2xl p-3.5 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--accent-bg)]/40 transition-all flex flex-col justify-between shadow-2xs text-left min-h-[96px] touch-manipulation ${animClass}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="w-5.5 h-5.5 rounded-full bg-[var(--accent-bg)]/15 text-[var(--accent-bg)] text-[11px] font-black flex items-center justify-center shrink-0 tabular-nums">
          #{idx + 1}
        </span>
        <button
          type="button"
          onClick={() => handleRemoveSuggestion(item.customIndex ?? idx)}
          className="w-6 h-6 rounded-full bg-[var(--bg-inset)] text-[var(--text-tertiary)] hover:bg-rose-500/15 hover:text-rose-500 border border-[var(--border-subtle)] transition-colors flex items-center justify-center cursor-pointer shrink-0"
          title="Remove option"
          aria-label={`Remove ${item.name}`}
        >
          <Trash2 size={12} />
        </button>
      </div>

      <div className="py-1">
        <h4 className="text-sm font-bold text-[var(--text-primary)] line-clamp-2 leading-snug min-h-[2.4em] flex items-center" title={item.name}>
          {item.name}
        </h4>
      </div>

      <div className="text-[10px] text-[var(--text-tertiary)] font-medium pt-1 border-t border-[var(--border-subtle)] truncate">
        {topic || 'Custom Poll'}
      </div>
    </div>
  );
}

function CandidatePoolCard({ item, idx, onSelectDetails, onRemoveVenue, isShuffling }) {
  const { lang, t } = useLanguage();
  const { primaryPhoto, fallbackPhoto } = useVenuePhotos(item.name, item.address, item.category, item.photo_url);
  const vibeSubtitle = getVenueVibe(item.name, item.category);
  const venueRating = getVenueRating(item.name, item.category);
  const travelText = formatTravelSummary(item, lang);

  const animClass = isShuffling
    ? (idx % 2 === 0 ? 'animate-shuffle-deck' : 'animate-shuffle-deck-alt')
    : 'animate-slide-up';

  return (
    <div
      onClick={() => {
        triggerHaptic('tap');
        onSelectDetails(item);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          triggerHaptic('tap');
          onSelectDetails(item);
        }
      }}
      data-testid="candidate-card"
      style={{ animationDelay: isShuffling ? `${(idx % 6) * 35}ms` : `${(idx % 8) * 45}ms` }}
      className={`rounded-2xl overflow-hidden bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--accent-bg)]/40 transition-all flex flex-col justify-between shadow-2xs relative group cursor-pointer text-left active:scale-[0.98] touch-manipulation ${animClass}`}
    >
      {/* Photo with Rating and Price Badge */}
      <div className="relative aspect-[16/10] w-full bg-[var(--bg-inset)] overflow-hidden">
        <img
          src={primaryPhoto}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = fallbackPhoto;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

        {/* Rating and Price Pills */}
        <div className="absolute top-2 left-2 flex items-center gap-1 z-10">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-bold text-amber-300 border border-white/10 shadow-2xs tabular-nums">
            <Star size={10} className="fill-amber-300 text-amber-300" />
            <span>{venueRating.rating}</span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-bold text-white border border-white/10 tabular-nums">
            {'$'.repeat(item.price_level || 2)}
          </span>
        </div>

        {/* Remove Venue Button */}
        {onRemoveVenue && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemoveVenue(item);
            }}
            className="absolute top-2 right-2 w-9 h-9 rounded-full bg-black/60 backdrop-blur-md text-white/80 hover:bg-rose-600 hover:text-white border border-white/10 transition-colors flex items-center justify-center cursor-pointer z-10 active:scale-90"
            title="Remove from table"
            aria-label={`Remove ${item.name}`}
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Card Body with Full Title & Travel Summary */}
      <div className="p-3 flex flex-col gap-1.5 flex-1 justify-between">
        <div>
          <h4
            className="text-sm font-bold text-[var(--text-primary)] line-clamp-2 leading-snug group-hover:text-[var(--accent-bg)] transition-colors min-h-[2.4em] flex items-center"
            title={item.name}
          >
            {item.name}
          </h4>
          <p className="text-[11px] text-[var(--text-secondary)] font-medium truncate mt-0.5">
            {vibeSubtitle}
          </p>
        </div>

        <div className="flex items-center justify-between text-[11px] text-[var(--text-tertiary)] pt-1.5 border-t border-[var(--border-subtle)]">
          <div className="flex items-center gap-1 truncate font-medium">
            <MapPin size={11} className="shrink-0 text-[var(--accent-bg)]" />
            <span className="truncate">{travelText}</span>
          </div>
          <span className="text-[10px] text-[var(--accent-bg)] font-bold shrink-0 ml-1">
            {t('details')}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function CandidatePoolDeck({
  mode,
  topic = '',
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
  onShuffle,
  onReportClosed,
}) {
  const { t } = useLanguage();
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [isShuffling, setIsShuffling] = useState(false);

  const handleShuffleClick = () => {
    triggerHaptic('selection');
    setIsShuffling(true);
    onShuffle?.();
    setTimeout(() => {
      setIsShuffling(false);
    }, 500);
  };

  return (
    <section className="min-w-0 shrink-0 p-3.5 sm:p-5 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-main)] flex flex-col gap-3.5 shadow-2xs">
      {/* Section Header */}
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

          {/* Discovery Mode: Add Next Place / Add All Buttons */}
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
                    const batch = remainingPoolCount <= 3 ? remainingPoolCount : 3;
                    handleAddNextPlace(batch);
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

      {/* Discovery Mode: Price Filter Notice */}
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

      {/* Custom Mode: Clean, Unobtrusive Input Bar (No Cluttered Idea Library) */}
      {mode === 'CUSTOM' && (
        <div className="pt-0.5 pb-1">
          <CustomOptionAutocomplete
            suggestion={suggestion}
            setSuggestion={setSuggestion}
            handleAddSuggestion={handleAddSuggestion}
            handleQuickAddSuggestion={handleQuickAddSuggestion}
            topic={topic}
            existingNames={candidates.map((c) => c.name)}
            duplicateMatch={duplicateMatch}
            mode={mode}
            disabled={candidates.length >= 12}
          />
        </div>
      )}

      {/* Candidates Grid */}
      <div
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
                <div className="flex items-center justify-between pt-1.5 border-t border-[var(--border-subtle)]">
                  <div className="h-2.5 bg-zinc-200/80 dark:bg-zinc-800/80 rounded-md w-1/3" />
                  <div className="h-2.5 bg-zinc-200/80 dark:bg-zinc-800/80 rounded-md w-8" />
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
          candidates.map((item, idx) =>
            mode === 'CUSTOM' || item.isCustom ? (
              <CustomOptionCard
                key={item.id || item.name || idx}
                item={item}
                idx={idx}
                topic={topic}
                handleRemoveSuggestion={handleRemoveSuggestion}
                isShuffling={isShuffling}
              />
            ) : (
              <CandidatePoolCard
                key={item.id || item.name || idx}
                item={item}
                idx={idx}
                onSelectDetails={setSelectedVenue}
                onRemoveVenue={handleRemovePlace}
                isShuffling={isShuffling}
              />
            )
          )
        )}
      </div>

      {/* Venue Details Modal */}
      <VenueDetailsModal
        key={selectedVenue?.id || selectedVenue?.name || 'lobby-venue-modal'}
        venue={selectedVenue}
        isOpen={Boolean(selectedVenue && !selectedVenue.isCustom && mode !== 'CUSTOM')}
        onClose={() => setSelectedVenue(null)}
        onReportClosed={(v) => {
          setSelectedVenue(null);
          onReportClosed?.(v);
        }}
      />
    </section>
  );
}
