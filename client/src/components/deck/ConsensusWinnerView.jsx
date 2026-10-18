import React from 'react';
import {
  Navigation,
  ExternalLink,
  Sparkles,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  Star,
  MessageSquarePlus,
  RotateCcw,
  MapPin,
} from 'lucide-react';
import Button from '../ui/Button';
import { getVenueImage, getVenueVibe, getVenueRating } from '../../utils/venueImages';

export default function ConsensusWinnerView({
  winner,
  matchScore,
  mapsDirUrl,
  condorcetOpen,
  setCondorcetOpen,
  pairwiseBreakdown = [],
  userRating,
  handleInlineRate,
  setIsReviewOpen,
  navigate,
}) {
  const winnerImage = getVenueImage(winner?.name, winner?.category);
  const winnerVibe = getVenueVibe(winner?.name, winner?.category);
  const winnerRating = getVenueRating(winner?.name, winner?.category);
  const distanceLabel = winner?.distance_km != null && winner.distance_km <= 5.0
    ? `${winner.distance_km} km`
    : (winner?.address ? winner.address.split(',')[0] : 'Centru');

  return (
    <main className="px-4 py-5 pb-12 flex flex-col items-center gap-4 flex-1 my-auto max-w-md mx-auto w-full animate-[modalSpring_0.35s_var(--spring-smooth)]">
      <div className="w-full rounded-3xl bg-[var(--bg-elevated)] overflow-hidden shadow-lg border border-[var(--border-main)] flex flex-col text-center">
        {/* Winner Hero Image Header */}
        <div className="relative h-56 w-full bg-[var(--bg-inset)]">
          <img
            src={winnerImage}
            alt={winner?.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />

          {/* Floating Rating & Winner Badge */}
          <div className="absolute top-4 inset-x-4 flex items-center justify-between">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/65 backdrop-blur-md text-xs font-bold text-amber-300 border border-white/10 shadow-xs tabular-nums">
              <Star size={13} className="fill-amber-300 text-amber-300" />
              <span>{winnerRating.rating}</span>
              <span className="text-[11px] text-white/75 font-normal">({winnerRating.reviewCount})</span>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-bold shadow-xs">
              Top Group Pick
            </span>
          </div>

          {/* Title overlay */}
          <div className="absolute bottom-4 inset-x-4 text-left">
            <span className="text-xs font-semibold text-amber-300">
              {winnerVibe}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-0.5">
              {winner?.name}
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-zinc-200 mt-1">
              <MapPin size={13} className="text-amber-400 shrink-0" />
              <span className="truncate">{winner?.address || 'Centru, Chișinău'}</span>
            </div>
          </div>
        </div>

        <div className="p-5 flex flex-col items-center gap-4">
          {/* Metrics Row */}
          <div className="grid grid-cols-3 gap-2.5 w-full">
            <div className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)]">
              <span className="text-[10px] font-semibold text-[var(--text-tertiary)]">Group Match</span>
              <span className="text-base font-black text-emerald-500 tabular-nums">
                {matchScore}%
              </span>
            </div>

            <div className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)]">
              <span className="text-[10px] font-semibold text-[var(--text-tertiary)]">Price</span>
              <span className="text-base font-bold text-[var(--text-primary)]">
                {'$'.repeat(winner?.price_level || 2)}
              </span>
            </div>

            <div className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)]">
              <span className="text-[10px] font-semibold text-[var(--text-tertiary)]">Location</span>
              <span className="text-xs font-bold text-[var(--text-primary)] truncate max-w-[90px] tabular-nums">
                {distanceLabel}
              </span>
            </div>
          </div>

          {/* Primary Action: Open in Google Maps */}
          <a
            href={mapsDirUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 px-4 rounded-2xl bg-[var(--accent-bg)] hover:bg-[var(--accent-bg-hover)] text-white flex items-center justify-center gap-2 text-sm font-bold transition-all shadow-[0_6px_20px_var(--accent-glow)] cursor-pointer"
          >
            <Navigation size={16} />
            <span>Open in Google Maps</span>
            <ExternalLink size={14} className="opacity-80" />
          </a>

          {/* Expandable How Your Group Voted Drawer */}
          <div className="w-full rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)] overflow-hidden text-left">
            <button
              type="button"
              onClick={() => setCondorcetOpen(!condorcetOpen)}
              className="w-full p-3.5 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              aria-expanded={condorcetOpen}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-[var(--accent-bg)]/10 text-[var(--accent-bg)] flex items-center justify-center">
                  <Sparkles size={15} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    How Your Group Voted
                  </span>
                  <span className="text-[11px] text-[var(--text-tertiary)]">
                    See head-to-head results against other spots
                  </span>
                </div>
              </div>
              {condorcetOpen ? (
                <ChevronUp size={16} className="text-[var(--text-tertiary)]" />
              ) : (
                <ChevronDown size={16} className="text-[var(--text-tertiary)]" />
              )}
            </button>

            {condorcetOpen && (
              <div className="p-3.5 pt-0 border-t border-[var(--border-subtle)] flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 pt-2.5">
                  <CheckCircle2 size={14} className="shrink-0 text-emerald-500" />
                  <span>Highest group approval (0 vetoes)</span>
                </div>

                <div className="flex flex-col gap-1.5">
                  {pairwiseBreakdown.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs"
                    >
                      <span className="font-medium text-[var(--text-primary)]">
                        Preferred over {item.opponent}
                      </span>
                      <span className="font-bold text-[var(--text-secondary)] px-2 py-0.5 rounded-md bg-[var(--bg-inset)] tabular-nums">
                        {item.score}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Star Feedback */}
          <div className="w-full flex items-center justify-between px-3 py-2.5 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)]">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              {userRating > 0 ? `Rated ${userRating}/5` : 'Happy with this pick?'}
            </span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleInlineRate(star)}
                  className="p-1 rounded-lg hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                  aria-label={`Rate ${star} stars`}
                >
                  <Star
                    size={18}
                    className={star <= userRating ? 'fill-amber-400 text-amber-400' : 'text-[var(--text-tertiary)]'}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Secondary Actions */}
          <div className="grid grid-cols-2 gap-2.5 w-full">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsReviewOpen(true)}
              icon={MessageSquarePlus}
              className="w-full rounded-xl"
            >
              Add Note
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/')}
              icon={RotateCcw}
              className="w-full rounded-xl"
            >
              New Pick
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
