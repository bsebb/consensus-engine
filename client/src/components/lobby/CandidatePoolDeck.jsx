import React from 'react';
import { Sparkles, ShieldCheck, Plus, AlertTriangle, Trash2, MapPin, Star } from 'lucide-react';
import Button from '../ui/Button';
import { getVenueImage, getVenueVibe, getVenueRating } from '../../utils/venueImages';

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
  // Cap displayed deck at 6 curated options to prevent swipe fatigue
  const displayedCandidates = candidates.slice(0, 6);

  return (
    <section className="p-4 sm:p-5 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-main)] flex flex-col gap-3.5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[var(--accent-bg)]" />
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            Places on the Table ({displayedCandidates.length})
          </h3>
        </div>
        <span className="text-xs text-[var(--text-secondary)] font-medium">
          Curated for your group
        </span>
      </div>

      {/* Group Spending Filter Notice */}
      {lockedConstraint && prunedCount > 0 && mode !== 'CUSTOM' && (
        <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 font-medium">
          <div className="flex items-center gap-2">
            <ShieldCheck size={15} className="text-amber-500 shrink-0" />
            <span>{prunedCount} spot(s) above {budgetLimit} MDL filtered out</span>
          </div>
          <span className="text-[11px] font-semibold text-amber-500 bg-amber-500/15 px-2 py-0.5 rounded-full">
            Within Budget
          </span>
        </div>
      )}

      {/* Brainstorm Input inside custom mode deck */}
      {mode === 'CUSTOM' && (
        <div className="flex flex-col gap-2 pt-1 pb-1">
          <form onSubmit={handleAddSuggestion} className="flex gap-2">
            <input
              type="text"
              id="lobby-custom-suggestion"
              aria-label="New candidate suggestion"
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              placeholder="Suggest a choice (e.g. Bowling, Tacos, Arcade)..."
              className="flex-1 text-xs rounded-xl px-3 py-2 bg-[var(--bg-inset)] border border-[var(--border-main)] focus:border-[var(--accent-bg)] outline-none text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-colors"
            />
            <Button type="submit" variant="primary" size="sm" icon={Plus}>
              Add
            </Button>
          </form>

          {duplicateMatch && (
            <div className="flex items-center gap-1.5 text-xs text-[var(--status-warning)] bg-[rgba(245,158,11,0.12)] px-2.5 py-1.5 rounded-lg animate-[fadeIn_0.2s_ease-out]">
              <AlertTriangle size={14} />
              <span>Notice: Similar to "{duplicateMatch}"</span>
            </div>
          )}
        </div>
      )}

      {/* Synchronized 2-Column Grid with Generous Visuals */}
      <div className="grid grid-cols-2 gap-3">
        {displayedCandidates.length === 0 ? (
          <div className="col-span-2 p-8 rounded-2xl bg-[var(--bg-inset)] border border-dashed border-[var(--border-subtle)] text-center flex flex-col items-center gap-2">
            <Sparkles size={22} className="text-[var(--accent-bg)] animate-pulse" />
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              No places to display
            </span>
            <span className="text-[11px] text-[var(--text-tertiary)] max-w-xs">
              {mode === 'CUSTOM'
                ? 'Type your choices above to populate the voting deck!'
                : 'Adjust your spending limit to see available spots.'}
            </span>
          </div>
        ) : (
          displayedCandidates.map((item, idx) => {
            const imageUrl = getVenueImage(item.name, item.category);
            const vibeSubtitle = getVenueVibe(item.name, item.category);
            const venueRating = getVenueRating(item.name, item.category);
            const distanceDisplay = item.distance_km != null ? `${item.distance_km} km` : (item.address || 'Chișinău');

            return (
              <div
                key={item.id || item.name || idx}
                className="rounded-2xl overflow-hidden bg-[var(--bg-inset)] border border-[var(--border-subtle)] hover:border-[var(--accent-bg)]/40 transition-all flex flex-col justify-between shadow-sm relative group"
              >
                {/* Hero Culinary Image Banner (h-32 with smooth zoom) */}
                <div className="relative h-32 sm:h-36 w-full bg-[var(--bg-elevated)] overflow-hidden">
                  <img
                    src={imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

                  {/* Verified Rating Pill */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-bold text-amber-300 border border-white/10 shadow-sm z-10">
                    <Star size={11} className="fill-amber-300 text-amber-300" />
                    <span>{venueRating.rating}</span>
                    <span className="text-[10px] text-white/70 font-normal">({venueRating.reviewCount})</span>
                  </div>

                  {/* Price Tag or Custom Remove Pill */}
                  <div className="absolute top-2.5 right-2.5 z-10">
                    {mode === 'CUSTOM' ? (
                      <button
                        type="button"
                        onClick={() => handleRemoveSuggestion(idx)}
                        className="w-6 h-6 rounded-full bg-black/60 text-white hover:bg-rose-600 transition-colors flex items-center justify-center cursor-pointer shadow-sm"
                        title="Remove option"
                        aria-label={`Remove ${item.name}`}
                      >
                        <Trash2 size={12} />
                      </button>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-bold text-amber-300 border border-white/10">
                        {'$'.repeat(item.price_level || 2)}
                      </span>
                    )}
                  </div>

                  {/* Title overlay at base of image */}
                  <div className="absolute bottom-2 inset-x-2.5 text-left">
                    <span className="text-xs sm:text-sm font-bold text-white line-clamp-1 drop-shadow-sm" title={item.name}>
                      {item.name}
                    </span>
                  </div>
                </div>

                {/* Metadata Footer */}
                <div className="p-2.5 flex flex-col gap-1 text-left">
                  <span className="text-[11px] text-[var(--accent-bg)] font-semibold truncate leading-tight">
                    {vibeSubtitle}
                  </span>
                  <div className="flex items-center gap-1 text-[11px] text-[var(--text-tertiary)] truncate">
                    <MapPin size={11} className="shrink-0 text-[var(--text-tertiary)]" />
                    <span className="truncate">{distanceDisplay}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
