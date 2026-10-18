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
            className="absolute top-6 right-6 px-4 py-2 rounded-2xl border-2 border-emerald-500 bg-emerald-500/20 text-emerald-300 font-black text-sm uppercase tracking-wider -rotate-12 backdrop-blur-md flex items-center gap-1.5 z-30 pointer-events-none select-none"
          >
            <ThumbsUp size={18} strokeWidth={2.5} />
            <span>Like</span>
          </div>
        )}
        {dragOffset.x < -30 && (
          <div
            style={{ opacity: Math.min(1, Math.abs(dragOffset.x) / 70) }}
            className="absolute top-6 left-6 px-4 py-2 rounded-2xl border-2 border-rose-500 bg-rose-500/20 text-rose-300 font-black text-sm uppercase tracking-wider rotate-12 backdrop-blur-md flex items-center gap-1.5 z-30 pointer-events-none select-none"
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
            <span>Veto Spot</span>
          </div>
        )}

        {/* Dominant Venue Photography */}
        <div className="relative flex-1 min-h-0 w-full bg-[var(--bg-inset)] overflow-hidden">
          <img
            src={imageUrl}
            alt={activeCard.name}
            className="w-full h-full object-cover"
            draggable="false"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10" />

          {/* Top Floating Pills: Category & Verified Rating */}
          <div className="absolute top-4 inset-x-4 flex items-center justify-between z-10">
            <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-xs font-semibold text-white border border-white/10">
              {vibeSubtitle}
            </span>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-xs font-bold text-amber-300 border border-white/10 tabular-nums">
              <Star size={13} className="fill-amber-300 text-amber-300" />
              <span>{cardRating}</span>
              <span className="text-[11px] text-white/75 font-normal">({cardReviewCount})</span>
            </div>
          </div>

          {/* Bottom Photo Overlay: Venue Name & Address */}
          <div className="absolute bottom-4 inset-x-4 text-left flex flex-col gap-1 z-10">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight line-clamp-1 drop-shadow-xs">
              {activeCard.name}
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-zinc-200 font-medium">
              <MapPin size={13} className="text-amber-400 shrink-0" />
              <span className="truncate">{activeCard.address || 'Centru, Chișinău'}</span>
            </div>
          </div>
        </div>

        {/* Clean 2-Spec Card Footer */}
        <div className="p-3.5 bg-[var(--bg-elevated)] grid grid-cols-2 gap-2.5 text-left shrink-0">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)] min-w-0">
            <Coins size={16} className="text-amber-500 shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-semibold text-[var(--text-tertiary)]">Price Range</span>
              <span className="text-xs font-bold text-[var(--text-primary)] truncate tabular-nums">{cardPriceDesc}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)] min-w-0">
            <Navigation size={16} className="text-[var(--accent-bg)] shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-semibold text-[var(--text-tertiary)]">Location</span>
              <span className="text-xs font-bold text-[var(--text-primary)] truncate tabular-nums">{cardWalkDesc}</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
