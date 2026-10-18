import React from 'react';
import { ThumbsUp, ThumbsDown, Flame, Star, MapPin, Coins, Navigation } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import MilledTray from '../ui/MilledTray';
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
    <main className="px-4 py-4 flex flex-col justify-center flex-1">
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
            ? 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s'
            : isDragging
            ? 'none'
            : 'transform 0.35s cubic-bezier(0.34, 1.4, 0.64, 1)',
          opacity: exitDirection ? 0 : 1,
          touchAction: 'none',
          willChange: isDragging ? 'transform' : 'auto',
        }}
        className="w-full rounded-2xl bg-[var(--bg-elevated)] p-4 shadow-[0_16px_48px_rgba(0,0,0,0.16)] border border-[var(--border-main)] flex flex-col gap-3 select-none relative overflow-hidden cursor-grab active:cursor-grabbing"
      >
        {/* Dynamic On-Drag Optical Stamps */}
        {dragOffset.x > 30 && (
          <div
            style={{ opacity: Math.min(1, dragOffset.x / 75) }}
            className="absolute top-5 right-5 px-3.5 py-1.5 rounded-xl border-[3px] border-emerald-500 bg-emerald-500/15 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 font-black text-xs uppercase tracking-widest -rotate-12 shadow-[0_0_24px_rgba(16,185,129,0.35)] backdrop-blur-md flex items-center gap-1.5 z-30 pointer-events-none select-none animate-[stampPop_0.15s_ease-out]"
          >
            <ThumbsUp size={15} strokeWidth={2.5} />
            <span>APPROVE</span>
          </div>
        )}
        {dragOffset.x < -30 && (
          <div
            style={{ opacity: Math.min(1, Math.abs(dragOffset.x) / 75) }}
            className="absolute top-5 left-5 px-3.5 py-1.5 rounded-xl border-[3px] border-rose-500 bg-rose-500/15 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 font-black text-xs uppercase tracking-widest rotate-12 shadow-[0_0_24px_rgba(244,63,94,0.35)] backdrop-blur-md flex items-center gap-1.5 z-30 pointer-events-none select-none animate-[stampPop_0.15s_ease-out]"
          >
            <ThumbsDown size={15} strokeWidth={2.5} />
            <span>PASS</span>
          </div>
        )}
        {dragOffset.y > 40 && Math.abs(dragOffset.x) < 55 && (
          <div
            style={{ opacity: Math.min(1, dragOffset.y / 70) }}
            className="absolute inset-x-6 top-6 py-2 rounded-2xl border-[3px] border-amber-400 bg-gradient-to-r from-red-600 to-rose-600 text-amber-200 font-black text-xs uppercase tracking-widest shadow-[0_0_32px_rgba(239,68,68,0.7)] backdrop-blur-md flex items-center justify-center gap-2 z-30 pointer-events-none select-none animate-pulse"
          >
            <Flame size={18} strokeWidth={2.5} />
            <span>VETO</span>
          </div>
        )}

        {/* Hero Culinary Image Banner */}
        <div className="relative h-44 w-full rounded-xl overflow-hidden bg-[var(--bg-inset)]">
          <img
            src={imageUrl}
            alt={activeCard.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Category Badge & Star Rating Over Image */}
          <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between">
            <span className="px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-xs text-[10px] font-bold uppercase tracking-wider text-white">
              {activeCard.tags?.[0] || activeCard.category || 'Spot'}
            </span>

            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-xs text-[11px] font-bold text-amber-300">
              <Star size={12} className="fill-amber-300 text-amber-300" />
              <span>{cardRating}</span>
              <span className="text-[10px] text-white/80 font-normal">({cardReviewCount}+)</span>
            </div>
          </div>

          {/* Vibe Subtitle overlay at bottom of image */}
          <div className="absolute bottom-2 inset-x-3 text-left">
            <span className="text-xs font-bold text-amber-300 drop-shadow-sm">
              {vibeSubtitle}
            </span>
          </div>
        </div>

        {/* Venue Headline */}
        <div className="flex flex-col gap-0.5 text-left pt-0.5">
          <h3 className="text-xl font-black text-[var(--text-primary)] tracking-tight line-clamp-1" title={activeCard.name}>
            {activeCard.name}
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <MapPin size={13} className="shrink-0 text-[var(--accent-bg)]" />
            <span className="truncate">{activeCard.address || 'Centru, Chișinău'}</span>
          </div>
        </div>

        {/* Calibrated Specs Strip: Price tier + Distance & Walk */}
        <div className="grid grid-cols-2 gap-2 text-left">
          <MilledTray className="flex items-center gap-2 px-3 py-2">
            <Coins size={14} className="text-[var(--text-tertiary)] shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] tracking-wider">Price Tier</span>
              <span className="text-xs font-bold text-[var(--text-primary)] font-mono truncate">{cardPriceDesc}</span>
            </div>
          </MilledTray>

          <MilledTray className="flex items-center gap-2 px-3 py-2">
            <Navigation size={14} className="text-[var(--accent-bg)] shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] tracking-wider">Distance</span>
              <span className="text-xs font-bold text-[var(--text-primary)] font-mono truncate">{cardWalkDesc}</span>
            </div>
          </MilledTray>
        </div>

        {/* Tags Tray */}
        {activeCard.tags && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {activeCard.tags.map((tag, i) => (
              <span
                key={i}
                className="px-2.5 py-0.5 rounded-lg bg-[var(--bg-inset)] text-[10px] font-medium text-[var(--text-secondary)] border border-[var(--border-subtle)]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Gesture Helper Hint */}
        <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[10px] font-semibold text-[var(--text-tertiary)]">
          <span className="flex items-center gap-1"><ThumbsDown size={11} /> Pass</span>
          <span className="text-[var(--status-danger)] font-bold flex items-center gap-1"><Flame size={11} /> Veto</span>
          <span className="flex items-center gap-1">Approve <ThumbsUp size={11} /></span>
        </div>
      </div>
    </main>
  );
}
