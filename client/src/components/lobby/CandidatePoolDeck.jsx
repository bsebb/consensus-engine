import React, { useState } from 'react';
import { Sparkles, ShieldCheck, Plus, AlertTriangle, Trash2, MapPin, Star, Info } from 'lucide-react';
import Button from '../ui/Button';
import VenueDetailsModal from '../deck/VenueDetailsModal';
import { getVenueVibe, getVenueRating, useVenuePhotos } from '../../utils/venueImages';
import { formatTravelSummary } from '../../utils/location';

function CandidatePoolCard({ item, idx, handleRemoveSuggestion, onSelectDetails }) {
  const { primaryPhoto, fallbackPhoto } = useVenuePhotos(item.name, item.address, item.category);
  const vibeSubtitle = getVenueVibe(item.name, item.category);
  const venueRating = getVenueRating(item.name, item.category);
  const travelText = formatTravelSummary(item);

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
      {/* Real Venue Image */}
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

        {/* Price Tag or Custom Remove Pill */}
        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1">
          {item.isCustom ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveSuggestion(item.customIndex ?? idx);
              }}
              className="w-6 h-6 rounded-full bg-black/65 text-white hover:bg-rose-600 transition-colors flex items-center justify-center cursor-pointer shadow-2xs"
              title="Remove option"
              aria-label={`Remove ${item.name}`}
            >
              <Trash2 size={12} />
            </button>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-black/65 backdrop-blur-md text-[11px] font-bold text-white border border-white/10">
              {'$'.repeat(item.price_level || 2)}
            </span>
          )}
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
  candidates = [],
  lockedConstraint,
  prunedCount,
  budgetLimit,
  suggestion,
  setSuggestion,
  handleAddSuggestion,
  handleRemoveSuggestion,
  duplicateMatch,
}) {
  const [showAddInput, setShowAddInput] = useState(mode === 'CUSTOM');
  const [selectedVenue, setSelectedVenue] = useState(null);

  // Cap displayed deck at 8 options (6 curated + up to 2 custom additions)
  const displayedCandidates = candidates.slice(0, 8);

  return (
    <section className="p-4 sm:p-5 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-main)] flex flex-col gap-3.5 shadow-2xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[var(--accent-bg)]" />
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            Places on the Table ({displayedCandidates.length})
          </h3>
        </div>

        {mode !== 'CUSTOM' && (
          <button
            type="button"
            onClick={() => setShowAddInput((prev) => !prev)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--bg-inset)] hover:bg-black/5 dark:hover:bg-white/5 border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <Plus size={13} />
            <span>{showAddInput ? 'Close' : 'Add a Spot'}</span>
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

      {/* Add Spot Input */}
      {(mode === 'CUSTOM' || showAddInput) && (
        <div className="flex flex-col gap-2 pt-0.5 pb-1">
          <form onSubmit={handleAddSuggestion} className="flex gap-2">
            <input
              type="text"
              id="lobby-custom-suggestion"
              aria-label="New candidate suggestion"
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              placeholder={mode === 'CUSTOM' ? 'Type an option (e.g. Bowling, Tacos, Arcade)...' : 'Add another spot (e.g. Tucano, Gastrobar)...'}
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
        </div>
      )}

      {/* 2-Column Venue Grid */}
      <div className="grid grid-cols-2 gap-3">
        {displayedCandidates.length === 0 ? (
          <div className="col-span-2 p-8 rounded-2xl bg-[var(--bg-inset)] border border-dashed border-[var(--border-main)] text-center flex flex-col items-center gap-2">
            <Sparkles size={22} className="text-[var(--accent-bg)]" />
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              {mode === 'CUSTOM' ? 'Add at least 2 options above' : 'No spots match this price filter'}
            </span>
            <span className="text-[11px] text-[var(--text-tertiary)] max-w-xs">
              {mode === 'CUSTOM'
                ? 'Everyone in the room can type ideas to build your voting deck.'
                : 'Tap a higher price tier below to see more places nearby.'}
            </span>
          </div>
        ) : (
          displayedCandidates.map((item, idx) => (
            <CandidatePoolCard
              key={item.id || item.name || idx}
              item={item}
              idx={idx}
              handleRemoveSuggestion={handleRemoveSuggestion}
              onSelectDetails={setSelectedVenue}
            />
          ))
        )}
      </div>

      {/* Venue Details & Road Route Modal */}
      <VenueDetailsModal
        venue={selectedVenue}
        isOpen={Boolean(selectedVenue)}
        onClose={() => setSelectedVenue(null)}
      />
    </section>
  );
}
