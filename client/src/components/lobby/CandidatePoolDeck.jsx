import React, { useState, useEffect } from 'react';
import { Sparkles, ShieldCheck, Plus, AlertTriangle, Trash2, MapPin, Star, Info, Check, Layers } from 'lucide-react';
import Button from '../ui/Button';
import VenueDetailsModal from '../deck/VenueDetailsModal';
import { getVenueVibe, getVenueRating, useVenuePhotos, CUSTOM_POLL_LIBRARY } from '../../utils/venueImages';
import { formatTravelSummary } from '../../utils/location';
import { inferLibraryTabFromTopic, useCustomOptionPhoto } from '../../utils/customOptionService';

function CustomOptionCard({ item, idx, topic, handleRemoveSuggestion }) {
  const { photo } = useCustomOptionPhoto(item.name, topic, item.photo_url);
  const [imgError, setImgError] = useState(false);

  if (photo && !imgError) {
    return (
      <div className="rounded-2xl overflow-hidden bg-[var(--bg-inset)] border border-[var(--border-subtle)] hover:border-[var(--accent-bg)]/50 transition-all flex flex-col justify-between shadow-2xs relative group text-left">
        <div className="relative h-32 sm:h-36 w-full bg-[var(--bg-elevated)] overflow-hidden">
          <img
            src={photo}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={() => setImgError(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

          {/* Index pill */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/65 backdrop-blur-md text-[11px] font-bold text-white border border-white/10 shadow-2xs z-10 tabular-nums">
            <span>#{idx + 1}</span>
          </div>

          {/* Remove option button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleRemoveSuggestion(item.customIndex ?? idx);
            }}
            className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-black/65 backdrop-blur-md text-white/80 hover:bg-rose-600 hover:text-white border border-white/10 transition-colors flex items-center justify-center cursor-pointer z-10"
            title="Remove option"
            aria-label={`Remove ${item.name}`}
          >
            <Trash2 size={12} />
          </button>

          {/* Title overlay at base of image */}
          <div className="absolute bottom-2 inset-x-2.5 flex items-center justify-between gap-1">
            <span className="text-xs sm:text-sm font-bold text-white line-clamp-2 drop-shadow-xs" title={item.name}>
              {item.name}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-2.5 flex items-center justify-between gap-2 text-left">
          <span className="text-[11px] text-[var(--text-secondary)] font-semibold truncate leading-tight">
            {topic || 'Custom Poll'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-3 bg-[var(--bg-inset)] border border-[var(--border-subtle)] hover:border-[var(--accent-bg)]/40 transition-all flex flex-col justify-between min-h-[120px] shadow-2xs text-left">
      <div className="flex items-center justify-between gap-2">
        <div className="w-6 h-6 rounded-lg bg-[var(--accent-bg)]/15 text-[var(--accent-bg)] text-xs font-black flex items-center justify-center shrink-0 tabular-nums">
          #{idx + 1}
        </div>
        <button
          type="button"
          onClick={() => handleRemoveSuggestion(item.customIndex ?? idx)}
          className="w-6 h-6 rounded-full bg-[var(--bg-elevated)] text-[var(--text-tertiary)] hover:bg-rose-500/15 hover:text-rose-500 border border-[var(--border-subtle)] transition-colors flex items-center justify-center cursor-pointer shrink-0"
          title="Remove option"
          aria-label={`Remove ${item.name}`}
        >
          <Trash2 size={12} />
        </button>
      </div>

      <div className="py-2">
        <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)] line-clamp-2 leading-snug" title={item.name}>
          {item.name}
        </span>
      </div>

      <div className="text-[10px] text-[var(--text-tertiary)] font-medium">
        {topic || 'Custom Option'}
      </div>
    </div>
  );
}

function CandidatePoolCard({ item, idx, topic, handleRemoveSuggestion, onSelectDetails }) {
  const { primaryPhoto, fallbackPhoto } = useVenuePhotos(item.name, item.address, item.category, item.photo_url);
  const vibeSubtitle = getVenueVibe(item.name, item.category);
  const venueRating = getVenueRating(item.name, item.category);
  const travelText = formatTravelSummary(item);

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
      className="rounded-2xl overflow-hidden bg-[var(--bg-inset)] border border-[var(--border-subtle)] hover:border-[var(--accent-bg)]/50 transition-all flex flex-col justify-between shadow-2xs relative group cursor-pointer text-left"
    >
      {/* Curated Venue Image */}
      <div className="relative h-32 sm:h-36 w-full bg-[var(--bg-elevated)] overflow-hidden">
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

        {/* Verified Rating Pill */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/65 backdrop-blur-md text-[11px] font-bold text-amber-300 border border-white/10 shadow-2xs z-10 tabular-nums">
          <Star size={11} className="fill-amber-300 text-amber-300" />
          <span>{venueRating.rating}</span>
          <span className="text-[10px] text-white/75 font-normal">({venueRating.reviewCount})</span>
        </div>

        {/* Price Tag */}
        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1">
          <span className="px-2 py-0.5 rounded-full bg-black/65 backdrop-blur-md text-[11px] font-bold text-white border border-white/10">
            {'$'.repeat(item.price_level || 2)}
          </span>
        </div>

        {/* Title overlay at base of image */}
        <div className="absolute bottom-2 inset-x-2.5 flex items-center justify-between gap-1">
          <span className="text-xs sm:text-sm font-bold text-white line-clamp-1 drop-shadow-xs" title={item.name}>
            {item.name}
          </span>
          <span className="px-1.5 py-0.5 rounded-md bg-white/20 backdrop-blur-xs text-[10px] font-semibold text-white shrink-0 flex items-center gap-0.5">
            <Info size={10} />
            <span>Details</span>
          </span>
        </div>
      </div>

      {/* Metadata Footer with Road Distance & Travel Time */}
      <div className="p-2.5 flex flex-col gap-0.5 text-left">
        <span className="text-[11px] text-[var(--text-secondary)] font-semibold truncate leading-tight">
          {vibeSubtitle}
        </span>
        <div className="flex items-center gap-1 text-[11px] text-[var(--text-tertiary)] truncate">
          <MapPin size={11} className="shrink-0 text-[var(--accent-bg)]" />
          <span className="truncate">{travelText}</span>
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
}) {
  const [showAddInput, setShowAddInput] = useState(mode === 'CUSTOM');
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [activeLibraryTab, setActiveLibraryTab] = useState(() => inferLibraryTabFromTopic(topic));

  useEffect(() => {
    if (topic) {
      setActiveLibraryTab(inferLibraryTabFromTopic(topic));
    }
  }, [topic]);

  // Cap displayed deck at 8 options
  const displayedCandidates = candidates.slice(0, 8);
  const existingNamesLower = new Set(candidates.map((c) => String(c.name || '').toLowerCase().trim()));
  const currentLibraryCategory = CUSTOM_POLL_LIBRARY.find((cat) => cat.id === activeLibraryTab) || CUSTOM_POLL_LIBRARY[0];

  return (
    <section className="p-4 sm:p-5 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-main)] flex flex-col gap-3.5 shadow-2xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[var(--accent-bg)]" />
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            {mode === 'CUSTOM'
              ? `Options on the Table (${displayedCandidates.length})`
              : `Places on the Table (${displayedCandidates.length})`}
          </h3>
        </div>

        {mode !== 'CUSTOM' && (
          <button
            type="button"
            onClick={() => setShowAddInput((prev) => !prev)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--bg-inset)] hover:bg-black/5 dark:hover:bg-white/5 border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <Plus size={13} />
            <span>{showAddInput ? 'Close' : 'Add Option'}</span>
          </button>
        )}
      </div>

      {/* Group Spending Filter Notice */}
      {lockedConstraint && prunedCount > 0 && mode !== 'CUSTOM' && (
        <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 font-medium">
          <div className="flex items-center gap-2">
            <ShieldCheck size={15} className="text-amber-500 shrink-0" />
            <span>{prunedCount} pricier spot(s) above {budgetLimit} MDL hidden</span>
          </div>
          <span className="text-[11px] font-semibold text-amber-500 bg-amber-500/15 px-2 py-0.5 rounded-full">
            Filtered
          </span>
        </div>
      )}

      {/* Add Option Input */}
      {(mode === 'CUSTOM' || showAddInput) && (
        <div className="flex flex-col gap-2.5 pt-0.5 pb-1">
          <form onSubmit={handleAddSuggestion} className="flex gap-2">
            <input
              type="text"
              id="lobby-custom-suggestion"
              aria-label="New candidate suggestion"
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              placeholder={mode === 'CUSTOM' ? 'Type your own idea (e.g. Bowling, Movie Night, Poker)...' : 'Add a custom option...'}
              className="flex-1 text-xs rounded-xl px-3.5 py-2.5 bg-[var(--bg-inset)] border border-[var(--border-main)] focus:border-[var(--accent-bg)] outline-none text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-colors"
            />
            <Button type="submit" variant="primary" size="sm" icon={Plus}>
              Add
            </Button>
          </form>

          {duplicateMatch && (
            <div className="flex items-center gap-1.5 text-xs text-[var(--status-warning)] bg-[rgba(245,158,11,0.12)] px-2.5 py-1.5 rounded-lg">
              <AlertTriangle size={14} />
              <span>Already on the table: "{duplicateMatch}"</span>
            </div>
          )}

          {/* Quick-Add Idea Library for Custom Polls */}
          {mode === 'CUSTOM' && handleQuickAddSuggestion && (
            <div className="p-3 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)] flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                  <Layers size={13} className="text-[var(--accent-bg)]" />
                  <span>Idea Library • Tap to Add</span>
                </div>
                <span className="text-[10px] font-semibold text-[var(--text-tertiary)]">
                  {displayedCandidates.length}/8 selected
                </span>
              </div>

              {/* Category Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
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
                      disabled={isAdded || displayedCandidates.length >= 8}
                      onClick={() => handleQuickAddSuggestion(idea)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
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
            <Sparkles size={22} className="text-[var(--accent-bg)]" />
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              {mode === 'CUSTOM' ? 'Pick at least 2 options from the Idea Library or type your own' : 'No spots match this price filter'}
            </span>
            <span className="text-[11px] text-[var(--text-tertiary)] max-w-xs">
              {mode === 'CUSTOM'
                ? 'Custom polls have no fake ratings, distances, or prices • just pure group voting.'
                : 'Tap a higher price tier below to see more places nearby.'}
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

