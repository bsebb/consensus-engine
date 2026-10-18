import React, { useState, useEffect } from 'react';
import {
  LayoutGrid,
  PlusCircle,
  ShieldCheck,
  Plus,
  AlertTriangle,
  Trash2,
  MapPin,
  Star,
  Info,
  Check,
  Layers,
  Shuffle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import VenueDetailsModal from '../deck/VenueDetailsModal';
import CustomOptionAutocomplete from './CustomOptionAutocomplete';
import { getVenueVibe, getVenueRating, useVenuePhotos, CUSTOM_POLL_LIBRARY } from '../../utils/venueImages';
import { formatTravelSummary } from '../../utils/location';
import { inferLibraryTabFromTopic, useCustomOptionPhoto, isLogoImage } from '../../utils/customOptionService';
import { useLanguage } from '../../context/LanguageContext';
import { triggerHaptic } from '../../utils/haptics';

function CustomOptionCard({ item, idx, topic, handleRemoveSuggestion }) {
  const { photo } = useCustomOptionPhoto(item.name, topic, item.photo_url);
  const [imgError, setImgError] = useState(false);

  if (photo && !imgError) {
    const isLogo = isLogoImage(photo);
    return (
      <div className="rounded-2xl overflow-hidden bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--accent-bg)]/40 transition-all flex flex-col justify-between shadow-2xs relative group text-left">
        <div className={`relative aspect-[4/3] w-full ${isLogo ? 'bg-zinc-900' : 'bg-[var(--bg-inset)]'} overflow-hidden`}>
          <img
            src={photo}
            alt={item.name}
            className={isLogo ? 'w-full h-full object-contain p-4 pb-6' : 'w-full h-full object-cover group-hover:scale-105 transition-transform duration-300'}
            loading="lazy"
            onError={() => setImgError(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

          {/* Index pill */}
          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-bold text-white border border-white/10 shadow-2xs z-10 tabular-nums">
            <span>#{idx + 1}</span>
          </div>

          {/* Remove button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleRemoveSuggestion(item.customIndex ?? idx);
            }}
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 backdrop-blur-md text-white/80 hover:bg-rose-600 hover:text-white border border-white/10 transition-colors flex items-center justify-center cursor-pointer z-10"
            title="Remove option"
            aria-label={`Remove ${item.name}`}
          >
            <Trash2 size={12} />
          </button>
        </div>

        {/* Card Body */}
        <div className="p-3 flex flex-col gap-1 flex-1 justify-between">
          <h4 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] line-clamp-2 leading-snug min-h-[2.4em] flex items-center" title={item.name}>
            {item.name}
          </h4>
          <div className="text-[10px] text-[var(--text-tertiary)] font-medium pt-1 border-t border-[var(--border-subtle)] truncate">
            {topic || 'Custom Poll'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-3 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--accent-bg)]/40 transition-all flex flex-col justify-between min-h-[140px] shadow-2xs text-left">
      <div className="flex items-center justify-between gap-2">
        <div className="w-6 h-6 rounded-full bg-[var(--accent-bg)]/15 text-[var(--accent-bg)] text-xs font-black flex items-center justify-center shrink-0 tabular-nums">
          #{idx + 1}
        </div>
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

      <div className="py-2">
        <h4 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] line-clamp-2 leading-snug" title={item.name}>
          {item.name}
        </h4>
      </div>

      <div className="text-[10px] text-[var(--text-tertiary)] font-medium pt-1 border-t border-[var(--border-subtle)]">
        {topic || 'Custom Option'}
      </div>
    </div>
  );
}

function CandidatePoolCard({ item, idx, topic, handleRemoveSuggestion, onSelectDetails }) {
  const { lang, t } = useLanguage();
  const { primaryPhoto, fallbackPhoto } = useVenuePhotos(item.name, item.address, item.category, item.photo_url);
  const vibeSubtitle = getVenueVibe(item.name, item.category);
  const venueRating = getVenueRating(item.name, item.category);
  const travelText = formatTravelSummary(item, lang);

  if (item.isCustom) {
    return (
      <CustomOptionCard
        item={item}
        idx={idx}
        topic={topic}
        handleRemoveSuggestion={handleRemoveSuggestion}
      />
    );
  }

  return (
    <div
      onClick={() => onSelectDetails(item)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onSelectDetails(item);
      }}
      className="rounded-2xl overflow-hidden bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--accent-bg)]/40 transition-all flex flex-col justify-between shadow-2xs relative group cursor-pointer text-left active:scale-[0.98]"
    >
      {/* Photo with Rating and Price Badge */}
      <div className="relative aspect-[4/3] w-full bg-[var(--bg-inset)] overflow-hidden">
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

        {/* Rating Pill */}
        <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-bold text-amber-300 border border-white/10 shadow-2xs z-10 tabular-nums">
          <Star size={10} className="fill-amber-300 text-amber-300" />
          <span>{venueRating.rating}</span>
          <span className="text-[10px] text-white/70 font-normal">({venueRating.reviewCount})</span>
        </div>

        {/* Price Tag */}
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
          <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-bold text-white border border-white/10 tabular-nums">
            {'$'.repeat(item.price_level || 2)}
          </span>
        </div>
      </div>

      {/* Card Body with Full Title & Travel Summary */}
      <div className="p-3 flex flex-col gap-1.5 flex-1 justify-between">
        <div>
          <h4
            className="text-xs sm:text-sm font-bold text-[var(--text-primary)] line-clamp-2 leading-snug group-hover:text-[var(--accent-bg)] transition-colors min-h-[2.4em] flex items-center"
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
  isLoading = false,
  lockedConstraint,
  prunedCount,
  budgetLimit,
  suggestion,
  setSuggestion,
  handleAddSuggestion,
  handleQuickAddSuggestion,
  handleRemoveSuggestion,
  duplicateMatch,
  onShuffle,
}) {
  const { t } = useLanguage();
  const [showAddInput, setShowAddInput] = useState(mode === 'CUSTOM');
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [activeLibraryTab, setActiveLibraryTab] = useState(() => inferLibraryTabFromTopic(topic));

  useEffect(() => {
    if (topic) {
      setActiveLibraryTab(inferLibraryTabFromTopic(topic));
    }
  }, [topic]);

  // Display up to 6 initially, or up to 16 when expanded
  const displayedCandidates = expanded ? candidates.slice(0, 16) : candidates.slice(0, 6);
  const existingNamesLower = new Set(candidates.map((c) => String(c.name || '').toLowerCase().trim()));
  const currentLibraryCategory = CUSTOM_POLL_LIBRARY.find((cat) => cat.id === activeLibraryTab) || CUSTOM_POLL_LIBRARY[0];

  return (
    <section className="p-4 sm:p-5 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-main)] flex flex-col gap-3.5 shadow-2xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <LayoutGrid size={16} className="text-[var(--accent-bg)] shrink-0" />
          <h3 className="text-sm font-bold text-[var(--text-primary)] truncate">
            {mode === 'CUSTOM'
              ? `${t('optionsOnTable')} (${candidates.length})`
              : `${t('placesOnTable')} (${candidates.length})`}
          </h3>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onShuffle && candidates.length > 1 && (
            <button
              type="button"
              onClick={onShuffle}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--bg-inset)] hover:bg-black/5 dark:hover:bg-white/5 border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer active:scale-[0.96]"
              title={t('findDifferent')}
              aria-label={t('findDifferent')}
            >
              <Shuffle size={12} className="text-[var(--accent-bg)] shrink-0" />
              <span>{t('findDifferent')}</span>
            </button>
          )}

          {mode !== 'CUSTOM' && (
            <button
              type="button"
              onClick={() => setShowAddInput((prev) => !prev)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--bg-inset)] hover:bg-black/5 dark:hover:bg-white/5 border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer active:scale-[0.96]"
            >
              <Plus size={13} />
              <span>{showAddInput ? t('close') : t('addOption')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Group Spending Filter Notice */}
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

      {/* Add Option Input with Multi-Domain Autocomplete */}
      {(mode === 'CUSTOM' || showAddInput) && (
        <div className="flex flex-col gap-2.5 pt-0.5 pb-1">
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

          {/* Quick-Add Idea Library for Custom Polls */}
          {mode === 'CUSTOM' && handleQuickAddSuggestion && (
            <div className="p-3 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)] flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                  <Layers size={13} className="text-[var(--accent-bg)]" />
                  <span>{t('ideaLibraryTitle')}</span>
                </div>
                <span className="text-[10px] font-semibold text-[var(--text-tertiary)] tabular-nums">
                  {candidates.length}/12 {t('selectedSuffix')}
                </span>
              </div>

              {/* Category Tabs */}
              <div
                className="no-scrollbar flex items-center gap-1.5 overflow-x-auto -mx-0.5 px-0.5"
                style={{ maskImage: 'linear-gradient(to right, black 88%, transparent)', WebkitMaskImage: 'linear-gradient(to right, black 88%, transparent)' }}
              >
                {CUSTOM_POLL_LIBRARY.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveLibraryTab(cat.id)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                      activeLibraryTab === cat.id
                        ? 'bg-[var(--accent-bg)] text-white shadow-2xs'
                        : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Quick-Add Idea Chips */}
              <div className="flex flex-wrap gap-1.5">
                {currentLibraryCategory.items.map((idea) => {
                  const isAdded = existingNamesLower.has(idea.toLowerCase());
                  return (
                    <button
                      key={idea}
                      type="button"
                      disabled={isAdded || candidates.length >= 12}
                      onClick={() => handleQuickAddSuggestion(idea)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        isAdded
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 cursor-default'
                          : 'bg-[var(--bg-elevated)] hover:border-[var(--accent-bg)] text-[var(--text-primary)] border border-[var(--border-subtle)] active:scale-95'
                      }`}
                    >
                      {isAdded ? <Check size={12} className="text-emerald-500" /> : <Plus size={12} className="text-[var(--accent-bg)]" />}
                      <span>{idea}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Candidate Grid (1-col or 2-col for Custom Options, 2-col for Places) */}
      <div className="grid grid-cols-2 gap-3">
        {isLoading ? (
          [0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={`skel-${i}`}
              className="rounded-2xl overflow-hidden bg-[var(--bg-inset)] border border-[var(--border-subtle)] flex flex-col justify-between shadow-2xs text-left animate-pulse"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="relative h-32 sm:h-36 w-full bg-zinc-200/60 dark:bg-zinc-800/60 flex flex-col justify-between p-2.5">
                <div className="flex items-center justify-between">
                  <div className="h-4 w-12 rounded-full bg-white/40 dark:bg-white/10" />
                  <div className="h-4 w-7 rounded-full bg-white/40 dark:bg-white/10" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-3.5 bg-white/60 dark:bg-white/20 rounded-md w-3/4" />
                  <div className="h-2.5 bg-white/40 dark:bg-white/10 rounded-md w-1/2" />
                </div>
              </div>
              <div className="p-2.5 flex flex-col gap-1.5">
                <div className="h-2.5 bg-zinc-300/70 dark:bg-zinc-700/60 rounded-md w-2/3" />
                <div className="h-2 bg-zinc-200/80 dark:bg-zinc-800/80 rounded-md w-4/5" />
              </div>
            </div>
          ))
        ) : displayedCandidates.length === 0 ? (
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
          displayedCandidates.map((item, idx) => (
            <CandidatePoolCard
              key={item.id || item.name || idx}
              item={item}
              idx={idx}
              topic={topic}
              handleRemoveSuggestion={handleRemoveSuggestion}
              onSelectDetails={setSelectedVenue}
            />
          ))
        )}
      </div>

      {/* Expand / Collapse Toggle for Pools with > 6 Candidates */}
      {candidates.length > 6 && (
        <button
          type="button"
          onClick={() => {
            triggerHaptic('tap');
            setExpanded((prev) => !prev);
          }}
          className="w-full py-2.5 px-3 rounded-2xl bg-[var(--bg-inset)] hover:bg-black/5 dark:hover:bg-white/5 border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-[0.98]"
        >
          {expanded ? (
            <>
              <ChevronUp size={14} />
              <span>{t('showLessPlaces')}</span>
            </>
          ) : (
            <>
              <ChevronDown size={14} />
              <span>{t('showMorePlaces')} ({candidates.length})</span>
            </>
          )}
        </button>
      )}

      {/* Venue Details & Road Route Modal (Discovery Places Only) */}
      <VenueDetailsModal
        key={selectedVenue?.id || selectedVenue?.name || 'lobby-venue-modal'}
        venue={selectedVenue}
        isOpen={Boolean(selectedVenue && !selectedVenue.isCustom && mode !== 'CUSTOM')}
        onClose={() => setSelectedVenue(null)}
      />
    </section>
  );
}

