import React from 'react';
import { Sparkles, ShieldCheck, Plus, AlertTriangle, Trash2, MapPin } from 'lucide-react';
import Button from '../ui/Button';
import { getVenueImage, getVenueVibe } from '../../utils/venueImages';

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
    <section className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-main)] flex flex-col gap-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[var(--accent-bg)]" />
          <span className="text-xs font-bold text-[var(--text-primary)]">
            Candidate Pool Deck ({displayedCandidates.length})
          </span>
        </div>
        <span className="text-xs text-[var(--text-secondary)] font-medium">
          Curated for your group
        </span>
      </div>

      {/* Confidential Step Zero Pruning Proof */}
      {lockedConstraint && prunedCount > 0 && mode !== 'CUSTOM' && (
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-500 font-semibold animate-[stampPop_0.2s_var(--spring-bounce)]">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-amber-500 shrink-0" />
            <span>Step Zero: {prunedCount} venue(s) exceeding {budgetLimit} MDL ceiling pruned</span>
          </div>
          <span className="font-mono text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded">
            Confidential
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

      {/* Synchronized 2-Column Grid with Authentic Visuals */}
      <div className="grid grid-cols-2 gap-2.5">
        {displayedCandidates.length === 0 ? (
          <div className="col-span-2 p-6 rounded-xl bg-[var(--bg-inset)] border border-dashed border-[var(--border-subtle)] text-center flex flex-col items-center gap-2">
            <Sparkles size={20} className="text-[var(--accent-bg)] animate-pulse" />
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              Candidate deck is waiting for options
            </span>
            <span className="text-[11px] text-[var(--text-tertiary)]">
              {mode === 'CUSTOM'
                ? 'Type your group choices above to populate the live voting cards!'
                : 'Adjust spending ceiling to display available venues.'}
            </span>
          </div>
        ) : (
          displayedCandidates.map((item, idx) => {
            const imageUrl = getVenueImage(item.name, item.category);
            const vibeSubtitle = getVenueVibe(item.name, item.category);
            const distanceDisplay = item.distance_km != null ? `${item.distance_km} km` : (item.address || 'Chișinău');

            return (
              <div
                key={item.id || item.name || idx}
                className="rounded-xl overflow-hidden bg-[var(--bg-inset)] border border-[var(--border-subtle)] hover:border-[var(--accent-bg)]/40 transition-all flex flex-col justify-between shadow-sm animate-[modalSpring_0.35s_var(--spring-smooth)] relative group"
              >
                {/* Hero Culinary Image Banner */}
                <div className="relative h-24 w-full bg-[var(--bg-elevated)] overflow-hidden">
                  <img
                    src={imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

                  {/* Price Tag or Custom Remove Pill */}
                  <div className="absolute top-2 right-2">
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
                      <span className="px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[10px] font-mono font-bold text-amber-300">
                        {'$'.repeat(item.price_level || 2)}
                      </span>
                    )}
                  </div>

                  {/* Title overlay at base of image */}
                  <div className="absolute bottom-1.5 inset-x-2 text-left">
                    <span className="text-xs font-bold text-white line-clamp-1 drop-shadow-sm" title={item.name}>
                      {item.name}
                    </span>
                  </div>
                </div>

                {/* Metadata Footer */}
                <div className="p-2 flex flex-col gap-1 text-left">
                  <span className="text-[10px] text-[var(--accent-bg)] font-semibold truncate leading-tight">
                    {vibeSubtitle}
                  </span>
                  <div className="flex items-center gap-1 text-[10px] text-[var(--text-tertiary)] truncate">
                    <MapPin size={10} className="shrink-0 text-[var(--text-tertiary)]" />
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
