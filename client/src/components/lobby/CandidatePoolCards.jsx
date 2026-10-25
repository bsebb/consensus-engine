import React from 'react';
import { Trash2, MapPin, Star, X, Sparkles } from 'lucide-react';
import { getVenueVibe, getVenueRating, useVenuePhotos } from '../../utils/venueImages';
import { formatTravelSummary } from '../../utils/location';
import { formatRegionalPricePill } from '../../utils/regionFormat';
import { useLanguage } from '../../context/LanguageContext';
import { triggerHaptic } from '../../utils/haptics';

export function CustomOptionCard({ item, idx, topic, handleRemoveSuggestion, isShuffling, isNewlyAdded, onSelectDetails }) {
  const { t } = useLanguage();
  const animClass = isShuffling
    ? (idx % 2 === 0 ? 'animate-shuffle-deck' : 'animate-shuffle-deck-alt')
    : 'animate-slide-up';
  const isRoutable = Boolean(item.isRoutablePlace || (item.address && item.address !== 'Added by group'));

  return (
    <div
      data-testid="candidate-card"
      onClick={() => {
        if (isRoutable && onSelectDetails) {
          triggerHaptic('tap');
          onSelectDetails(item);
        }
      }}
      role={isRoutable ? 'button' : undefined}
      tabIndex={isRoutable ? 0 : undefined}
      style={{ animationDelay: isShuffling ? `${(idx % 6) * 35}ms` : `${(idx % 8) * 45}ms` }}
      className={`relative rounded-2xl p-3.5 bg-[var(--bg-elevated)] border transition-all flex flex-col justify-between shadow-2xs text-left min-h-[96px] touch-manipulation ${
        isNewlyAdded
          ? 'border-emerald-500/60 ring-2 ring-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.18)]'
          : 'border-[var(--border-subtle)] hover:border-[var(--accent-bg)]/40'
      } ${isRoutable ? 'cursor-pointer active:scale-[0.98]' : ''} ${animClass}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-5.5 h-5.5 rounded-full bg-[var(--accent-bg)]/15 text-[var(--accent-bg)] text-[11px] font-black flex items-center justify-center shrink-0 tabular-nums">
            #{idx + 1}
          </span>
          {(isNewlyAdded || item.isGroupAdded || item.isCustom) && (
            <span
              data-testid="group-pick-badge"
              className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 truncate"
            >
              <Sparkles size={9} className="shrink-0" />
              <span>Group Pick</span>
            </span>
          )}
          {isRoutable && !isNewlyAdded && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--bg-inset)] text-[var(--text-secondary)] border border-[var(--border-subtle)] truncate tabular-nums">
              {item.distance_km != null ? `~${item.distance_km} km` : 'Nearest'}
            </span>
          )}
        </div>
        {handleRemoveSuggestion && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleRemoveSuggestion(item.customIndex ?? idx);
            }}
            className="w-6 h-6 rounded-full bg-[var(--bg-inset)] text-[var(--text-tertiary)] hover:bg-rose-500/15 hover:text-rose-500 border border-[var(--border-subtle)] transition-colors flex items-center justify-center cursor-pointer shrink-0"
            title="Remove option"
            aria-label={`Remove ${item.name}`}
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      <div className="py-1">
        <h4 className="text-sm font-bold text-[var(--text-primary)] line-clamp-2 leading-snug min-h-[2.4em] flex items-center" title={item.name}>
          {item.name}
        </h4>
        {item.address && item.address !== 'Added by group' && (
          <p className="text-[10px] text-[var(--text-tertiary)] font-medium truncate flex items-center gap-1 mt-0.5">
            <MapPin size={10} className="text-[var(--accent-bg)] shrink-0" />
            <span className="truncate">{item.address}</span>
          </p>
        )}
      </div>

      <div className="text-[10px] text-[var(--text-tertiary)] font-medium pt-1 border-t border-[var(--border-subtle)] truncate flex items-center justify-between">
        <span className="truncate">{topic || 'Custom Poll'}</span>
        {isRoutable && (
          <span className="text-[10px] text-[var(--accent-bg)] font-bold shrink-0 ml-1">
            {t('details') || 'Details'}
          </span>
        )}
      </div>
    </div>
  );
}

export function CandidatePoolCard({ item, idx, onSelectDetails, onRemoveVenue, isShuffling, isNewlyAdded }) {
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
      className={`rounded-2xl overflow-hidden bg-[var(--bg-elevated)] border transition-all flex flex-col justify-between shadow-2xs relative group cursor-pointer text-left active:scale-[0.98] touch-manipulation ${
        isNewlyAdded
          ? 'border-emerald-500/70 ring-2 ring-emerald-500/60 shadow-[0_0_24px_rgba(16,185,129,0.22)]'
          : item.isGroupAdded
          ? 'border-emerald-500/35 hover:border-emerald-500/60'
          : 'border-[var(--border-subtle)] hover:border-[var(--accent-bg)]/40'
      } ${animClass}`}
    >
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

        <div className="absolute top-2 left-2 flex items-center gap-1 z-10">
          {(item.isGroupAdded || isNewlyAdded) && (
            <span
              data-testid="group-pick-badge"
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/95 backdrop-blur-md text-[10px] font-bold text-white border border-white/20 shadow-xs"
            >
              <Sparkles size={9} />
              <span>Group Pick</span>
            </span>
          )}
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-bold text-amber-300 border border-white/10 shadow-2xs tabular-nums">
            <Star size={10} className="fill-amber-300 text-amber-300" />
            <span>{venueRating.rating}</span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-bold text-white border border-white/10 tabular-nums">
            {formatRegionalPricePill(item.price_level || 2, item)}
          </span>
        </div>

        {onRemoveVenue && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemoveVenue(item);
            }}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md text-white/80 hover:bg-rose-600 hover:text-white border border-white/10 transition-colors flex items-center justify-center cursor-pointer z-10 active:scale-90"
            title="Remove from table"
            aria-label={`Remove ${item.name}`}
          >
            <X size={12} />
          </button>
        )}
      </div>

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
