import React from 'react';
import { ThumbsUp, ThumbsDown, Flame, Star, MapPin, Coins, Navigation } from 'lucide-react';
import { getVenueImage, getVenueVibe } from '../../utils/venueImages';

export default function SwipeCard({
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
}) {
  const imageUrl = getVenueImage(activeCard.name, activeCard.category);
  const vibeSubtitle = getVenueVibe(activeCard.name, activeCard.category);

  return (
    <main className="px-4 py-2 flex flex-col justify-center flex-1 max-w-md mx-auto w-full">
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        style={{
          transform: exitDirection === 'right'
            ? 'translate3d(120%, 0, 0) rotate(15deg)'
            : exitDirection === 'left'
            ? 'translate3d(-120%, 0, 0) rotate(-15deg)'
            : exitDirection === 'down'
            ? 'translate3d(0, 120%, 0) scale(0.9)'
            : `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0) rotate(${dragOffset.x * 0.08}deg)`,
          transition: exitDirection
            ? 'transform 0.24s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.24s'
            : isDragging
            ? 'none'
            : 'transform 0.35s cubic-bezier(0.34, 1.4, 0.64, 1)',
          opacity: exitDirection ? 0 : 1,
          touchAction: 'none',
          willChange: isDragging ? 'transform' : 'auto',
        }}
        className="w-full h-[62vh] max-h-[560px] min-h-[460px] rounded-3xl bg-[var(--bg-elevated)] shadow-[0_24px_64px_rgba(0,0,0,0.18)] border border-[var(--border-main)] flex flex-col select-none relative overflow-hidden cursor-grab active:cursor-grabbing"
      >
        {/* Dynamic On-Drag Optical Stamps */}
        {dragOffset.x > 30 && (
          <div
            style={{ opacity: Math.min(1, dragOffset.x / 70) }}
            className="absolute top-6 right-6 px-4 py-2 rounded-2xl border-[3px] border-emerald-500 bg-emerald-500/20 text-emerald-400 font-black text-sm uppercase tracking-widest -rotate-12 shadow-[0_0_28px_rgba(16,185,129,0.45)] backdrop-blur-md flex items-center gap-1.5 z-30 pointer-events-none select-none"
          >
            <ThumbsUp size={18} strokeWidth={2.5} />
            <span>LIKE</span>
          </div>
        )}
        {dragOffset.x < -30 && (
          <div
            style={{ opacity: Math.min(1, Math.abs(dragOffset.x) / 70) }}
            className="absolute top-6 left-6 px-4 py-2 rounded-2xl border-[3px] border-rose-500 bg-rose-500/20 text-rose-400 font-black text-sm uppercase tracking-widest rotate-12 shadow-[0_0_28px_rgba(244,63,94,0.45)] backdrop-blur-md flex items-center gap-1.5 z-30 pointer-events-none select-none"
          >
            <ThumbsDown size={18} strokeWidth={2.5} />
            <span>PASS</span>
          </div>
        )}
        {dragOffset.y > 40 && Math.abs(dragOffset.x) < 55 && (
          <div
            style={{ opacity: Math.min(1, dragOffset.y / 70) }}
            className="absolute inset-x-8 top-8 py-2.5 rounded-2xl border-[3px] border-amber-400 bg-gradient-to-r from-red-600 to-rose-600 text-amber-200 font-black text-sm uppercase tracking-widest shadow-[0_0_36px_rgba(239,68,68,0.7)] backdrop-blur-md flex items-center justify-center gap-2 z-30 pointer-events-none select-none animate-pulse"
          >
            <Flame size={20} strokeWidth={2.5} />
            <span>VETO PLACE</span>
          </div>
        )}

        {/* Cinematic Dominant Culinary Photography (Takes 65% of Card) */}
        <div className="relative flex-1 w-full bg-[var(--bg-inset)] overflow-hidden">
          <img
            src={imageUrl}
            alt={activeCard.name}
            className="w-full h-full object-cover"
            draggable="false"
          />
          {/* Deep Cinematic Scrim */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-black/10" />

          {/* Top Floating Pills: Cuisine Badge & Star Rating */}
          <div className="absolute top-4 inset-x-4 flex items-center justify-between z-10">
            <span className="px-3 py-1 rounded-full bg-black/50 backdrop-blur-md text-[11px] font-bold text-white border border-white/10 shadow-sm">
              {activeCard.tags?.[0] || activeCard.category || 'Dining'}
            </span>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/50 backdrop-blur-md text-xs font-bold text-amber-300 border border-white/10 shadow-sm">
              <Star size={13} className="fill-amber-300 text-amber-300" />
              <span>{cardRating}</span>
              <span className="text-[11px] text-white/70 font-normal">({cardReviewCount})</span>
            </div>
          </div>

          {/* Bottom Photo Overlay: Headline, Vibe & Neighborhood */}
          <div className="absolute bottom-4 inset-x-4 text-left flex flex-col gap-1 z-10">
            <span className="text-xs font-semibold text-rose-300 tracking-wide">
              {vibeSubtitle}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight line-clamp-1 drop-shadow-sm">
              {activeCard.name}
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-zinc-200 font-medium">
              <MapPin size={13} className="text-rose-400 shrink-0" />
              <span className="truncate">{activeCard.address || 'Centru, Chișinău'}</span>
            </div>
          </div>
        </div>

        {/* Card Details Tray: Clean, Proportional Specs (Zero Box Clutter) */}
        <div className="p-4 bg-[var(--bg-elevated)] flex flex-col gap-3 text-left">
          {/* Price & Walk Time Row */}
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--bg-inset)] border border-[var(--border-subtle)]">
              <Coins size={15} className="text-amber-500 shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Estimated Price</span>
                <span className="text-xs font-bold text-[var(--text-primary)] truncate">{cardPriceDesc}</span>
              </div>
            </div>

            <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--bg-inset)] border border-[var(--border-subtle)]">
              <Navigation size={15} className="text-[var(--accent-bg)] shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Distance</span>
                <span className="text-xs font-bold text-[var(--text-primary)] truncate">{cardWalkDesc}</span>
              </div>
            </div>
          </div>

          {/* Quick Cuisine Tags */}
          {activeCard.tags && activeCard.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {activeCard.tags.slice(0, 3).map((tag, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-lg bg-[var(--bg-inset)] text-[11px] font-medium text-[var(--text-secondary)] border border-[var(--border-subtle)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
