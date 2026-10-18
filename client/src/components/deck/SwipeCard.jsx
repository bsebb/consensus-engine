import React, { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, Flame, Star, MapPin, Coins, Route, Info, Sparkles } from 'lucide-react';
import { getVenueVibe, useVenuePhotos } from '../../utils/venueImages';

export default function SwipeCard({
  mode,
  topic,
  cardIndex = 1,
  totalCards = 1,
  activeCard,
  dragOffset,
  exitDirection,
  isDragging,
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  handlePointerCancel,
  cardRating,
  cardReviewCount,
  cardPriceDesc,
  cardWalkDesc,
  onOpenDetails,
}) {
  const isCustomCard = Boolean(mode === 'CUSTOM' || activeCard?.isCustom);

  const { primaryPhoto, photos, isRealPhoto, fallbackPhoto } = useVenuePhotos(
    isCustomCard ? '' : activeCard?.name,
    isCustomCard ? '' : activeCard?.address,
    isCustomCard ? '' : activeCard?.category
  );
  const [photoIdx, setPhotoIdx] = useState(0);
  const [failedUrls, setFailedUrls] = useState({});

  useEffect(() => {
    setPhotoIdx(0);
    setFailedUrls({});
  }, [activeCard?.id, activeCard?.name]);

  const validPhotos = (photos || []).filter((u) => !failedUrls[u]);
  const displayPhoto = validPhotos[photoIdx] || validPhotos[0] || primaryPhoto || fallbackPhoto;
  const vibeSubtitle = getVenueVibe(activeCard?.name, activeCard?.category);

  return (
    <main className="px-4 py-2 flex flex-col justify-center flex-1 min-h-0 max-w-md mx-auto w-full">
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        style={{
          transform: exitDirection === 'right'
            ? 'translate3d(120%, 0, 0) rotate(14deg)'
            : exitDirection === 'left'
            ? 'translate3d(-120%, 0, 0) rotate(-14deg)'
            : exitDirection === 'down'
            ? 'translate3d(0, 120%, 0) scale(0.92)'
            : `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0) rotate(${dragOffset.x * 0.06}deg)`,
          transition: exitDirection
            ? 'transform 0.24s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.24s'
            : isDragging
            ? 'none'
            : 'transform 0.32s cubic-bezier(0.16, 1, 0.3, 1)',
          opacity: exitDirection ? 0 : 1,
          touchAction: 'none',
          willChange: isDragging ? 'transform' : 'auto',
        }}
        className="w-full flex-1 max-h-[520px] min-h-[340px] rounded-3xl bg-[var(--bg-elevated)] shadow-[0_20px_50px_rgba(0,0,0,0.14)] border border-[var(--border-main)] flex flex-col select-none relative overflow-hidden cursor-grab active:cursor-grabbing my-auto"
      >
        {/* Dynamic On-Drag Optical Stamps */}
        {dragOffset.x > 30 && (
          <div
            style={{ opacity: Math.min(1, dragOffset.x / 70) }}
            className="absolute top-6 right-6 px-4 py-2 rounded-2xl border-2 border-emerald-500 bg-emerald-500/20 text-emerald-400 font-black text-sm uppercase tracking-wider -rotate-12 backdrop-blur-md flex items-center gap-1.5 z-30 pointer-events-none select-none"
          >
            <ThumbsUp size={18} strokeWidth={2.5} />
            <span>Like</span>
          </div>
        )}
        {dragOffset.x < -30 && (
          <div
            style={{ opacity: Math.min(1, Math.abs(dragOffset.x) / 70) }}
            className="absolute top-6 left-6 px-4 py-2 rounded-2xl border-2 border-rose-500 bg-rose-500/20 text-rose-400 font-black text-sm uppercase tracking-wider rotate-12 backdrop-blur-md flex items-center gap-1.5 z-30 pointer-events-none select-none"
          >
            <ThumbsDown size={18} strokeWidth={2.5} />
            <span>Pass</span>
          </div>
        )}
        {dragOffset.y > 40 && Math.abs(dragOffset.x) < 55 && (
          <div
            style={{ opacity: Math.min(1, dragOffset.y / 70) }}
            className="absolute inset-x-8 top-8 py-2.5 rounded-2xl border-2 border-amber-400 bg-rose-600/90 text-white font-black text-sm uppercase tracking-wider backdrop-blur-md flex items-center justify-center gap-2 z-30 pointer-events-none select-none"
          >
            <Flame size={18} strokeWidth={2.5} />
            <span>{isCustomCard ? 'Veto Option' : 'Veto Spot'}</span>
          </div>
        )}

        {isCustomCard ? (
          /* Clean Custom Poll Ballot Card (Zero Fake Photos, Ratings, Prices, or Distances) */
          <div className="flex-1 flex flex-col justify-between p-6 text-center bg-gradient-to-b from-[var(--bg-elevated)] to-[var(--bg-inset)]">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent-bg)]/12 text-[var(--accent-bg)] text-xs font-bold truncate max-w-[70%]">
                <Sparkles size={12} />
                <span className="truncate">{topic || 'Custom Poll'}</span>
              </span>
              <span className="px-2.5 py-1 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-secondary)] tabular-nums">
                #{cardIndex} of {totalCards}
              </span>
            </div>

            <div className="my-auto py-8 px-2 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-3xl bg-[var(--accent-bg)]/12 border border-[var(--accent-bg)]/25 text-[var(--accent-bg)] flex items-center justify-center text-2xl font-black tabular-nums shadow-xs">
                #{cardIndex}
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight leading-tight max-w-xs break-words">
                {activeCard?.name}
              </h2>
              <p className="text-xs text-[var(--text-secondary)] max-w-[250px] leading-relaxed">
                Swipe right to support this option, swipe left to pass, or pull down to veto.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[var(--border-subtle)] text-[11px] font-bold">
              <div className="py-2 px-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-rose-500 flex items-center justify-center gap-1">
                <ThumbsDown size={12} />
                <span>Pass</span>
              </div>
              <div className="py-2 px-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-amber-500 flex items-center justify-center gap-1">
                <Flame size={12} />
                <span>Veto</span>
              </div>
              <div className="py-2 px-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-emerald-500 flex items-center justify-center gap-1">
                <ThumbsUp size={12} />
                <span>Like</span>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Dominant Curated Venue Photography */}
            <div className="relative flex-1 min-h-0 w-full bg-[var(--bg-inset)] overflow-hidden">
              <img
                src={displayPhoto}
                alt={activeCard.name}
                className="w-full h-full object-cover"
                draggable="false"
                onError={(e) => {
                  if (e.currentTarget.src !== fallbackPhoto) {
                    setFailedUrls((prev) => ({ ...prev, [displayPhoto]: true }));
                    e.currentTarget.src = fallbackPhoto;
                  }
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/15" />

              {/* Multi-photo Story Bars at Top */}
              {validPhotos.length > 1 && (
                <div className="absolute top-2.5 inset-x-4 flex items-center gap-1.5 z-20">
                  {validPhotos.slice(0, 4).map((url, idx) => (
                    <button
                      key={url}
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPhotoIdx(idx);
                      }}
                      aria-label={`View photo ${idx + 1}`}
                      className={`h-1 flex-1 rounded-full transition-all cursor-pointer ${
                        idx === photoIdx ? 'bg-white shadow-xs' : 'bg-white/35 hover:bg-white/60'
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Top Floating Pills: Category & Verified Rating */}
              <div className={`absolute ${validPhotos.length > 1 ? 'top-6' : 'top-4'} inset-x-4 flex items-center justify-between z-10`}>
                <span className="px-3 py-1 rounded-full bg-black/65 backdrop-blur-md text-xs font-semibold text-white border border-white/10">
                  {isRealPhoto ? `${vibeSubtitle} • Live Photo` : vibeSubtitle}
                </span>

                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/65 backdrop-blur-md text-xs font-bold text-amber-300 border border-white/10 tabular-nums">
                  <Star size={13} className="fill-amber-300 text-amber-300" />
                  <span>{cardRating}</span>
                  <span className="text-[11px] text-white/75 font-normal">({cardReviewCount})</span>
                </div>
              </div>

              {/* Bottom Photo Overlay: Venue Name, Address & Details Trigger */}
              <div className="absolute bottom-3.5 inset-x-4 text-left flex items-end justify-between gap-2 z-10">
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight line-clamp-1 drop-shadow-xs">
                    {activeCard.name}
                  </h2>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-200 font-medium">
                    <MapPin size={13} className="text-amber-400 shrink-0" />
                    <span className="truncate">{activeCard.address || 'Local Spot'}</span>
                  </div>
                </div>

                {onOpenDetails && (
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenDetails();
                    }}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/25 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Info size={13} />
                    <span>Details & Map</span>
                  </button>
                )}
              </div>
            </div>

            {/* Clean 2-Spec Card Footer: Price Range + Road Distance & Travel Time */}
            <div className="p-3.5 bg-[var(--bg-elevated)] grid grid-cols-2 gap-2.5 text-left shrink-0">
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)] min-w-0">
                <Coins size={16} className="text-amber-500 shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-semibold text-[var(--text-tertiary)]">Price Range</span>
                  <span className="text-xs font-bold text-[var(--text-primary)] truncate tabular-nums">{cardPriceDesc}</span>
                </div>
              </div>

              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOpenDetails) onOpenDetails();
                }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-[var(--bg-inset)] hover:bg-[var(--bg-surface)] border border-[var(--border-subtle)] min-w-0 text-left transition-colors cursor-pointer"
              >
                <Route size={16} className="text-[var(--accent-bg)] shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-semibold text-[var(--text-tertiary)]">Road Route & Time</span>
                  <span className="text-xs font-bold text-[var(--text-primary)] truncate tabular-nums">{cardWalkDesc}</span>
                </div>
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}


