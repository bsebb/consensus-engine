import React from 'react';
import {
  Trophy,
  Navigation,
  ExternalLink,
  Sparkles,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  Star,
  MessageSquarePlus,
  Clock,
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
  const distanceLabel = winner?.distance_km != null && winner.distance_km <= 3.5
    ? `${winner.distance_km} km`
    : (winner?.address ? winner.address.split(',')[0] : 'Centru, Chișinău');

  return (
    <main className="px-4 py-6 pb-12 flex flex-col items-center gap-5 flex-1 my-auto max-w-md mx-auto w-full animate-[modalSpring_0.4s_var(--spring-smooth)]">
      <div className="w-full rounded-3xl bg-[var(--bg-elevated)] overflow-hidden shadow-xl border border-[var(--border-main)] flex flex-col text-center">
        {/* Winner Hero Image Header */}
        <div className="relative h-56 w-full bg-[var(--bg-inset)]">
          <img
            src={winnerImage}
            alt={winner?.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />

          {/* Floating Rating & Status Pill */}
          <div className="absolute top-4 inset-x-4 flex items-center justify-between">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-xs font-bold text-amber-300 border border-white/10 shadow-sm">
              <Star size={13} className="fill-amber-300 text-amber-300" />
              <span>{winnerRating.rating}</span>
              <span className="text-[11px] text-white/70 font-normal">({winnerRating.reviewCount})</span>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 backdrop-blur-md border border-emerald-500/40 text-xs font-bold text-emerald-400">
              Group Consensus
            </span>
          </div>

          {/* Title overlay */}
          <div className="absolute bottom-4 inset-x-4 text-left">
            <span className="text-xs font-semibold text-rose-300 drop-shadow-sm">
              {winnerVibe}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-md">
              {winner?.name}
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-zinc-200 drop-shadow-sm mt-0.5">
              <MapPin size={12} className="text-rose-400" />
              <span>{winner?.address || 'Centru, Chișinău'}</span>
            </div>
          </div>
        </div>

        <div className="p-5 flex flex-col items-center gap-4">
          <p className="text-xs font-medium text-[var(--text-secondary)]">
            The group has spoken! Everyone's top-ranked spot.
          </p>

          {/* Metrics Row */}
          <div className="grid grid-cols-3 gap-2.5 w-full">
            <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)]">
              <span className="text-[10px] uppercase font-semibold text-[var(--text-tertiary)] tracking-wider">Group Match</span>
              <span className="text-base font-black text-emerald-500 tabular-nums">
                {matchScore}%
              </span>
            </div>

            <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)]">
              <span className="text-[10px] uppercase font-semibold text-[var(--text-tertiary)] tracking-wider">Price</span>
              <span className="text-base font-bold text-[var(--text-primary)]">
                {'$'.repeat(winner?.price_level || 2)}
              </span>
            </div>

            <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)]">
              <span className="text-[10px] uppercase font-semibold text-[var(--text-tertiary)] tracking-wider">Distance</span>
              <span className="text-xs font-bold text-[var(--text-primary)] truncate max-w-[85px]">
                {distanceLabel}
              </span>
            </div>
          </div>

          {/* Turn-by-Turn Google Maps Action */}
          <a
            href={mapsDirUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 px-4 rounded-xl bg-[var(--bg-inset)] hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center gap-2 text-xs font-bold text-[var(--text-primary)] border border-[var(--border-subtle)] transition-colors shadow-sm cursor-pointer"
          >
            <Navigation size={15} className="text-[var(--accent-bg)]" />
            <span>Turn-by-Turn Navigation (Google Maps)</span>
            <ExternalLink size={13} className="text-[var(--text-tertiary)]" />
          </a>

          {/* Expandable Why Did This Win? (Pairwise Condorcet Graph) Drawer */}
          <div className="w-full rounded-xl bg-[var(--bg-inset)] border border-[var(--border-subtle)] overflow-hidden text-left">
            <button
              type="button"
              onClick={() => setCondorcetOpen(!condorcetOpen)}
              className="w-full p-3.5 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              aria-expanded={condorcetOpen}
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[var(--accent-bg)]/10 text-[var(--accent-bg)] flex items-center justify-center">
                  <Sparkles size={15} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    How Your Group Voted
                  </span>
                  <span className="text-[10px] text-[var(--text-tertiary)]">
                    See why this was everyone's top choice
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
              <div className="p-3.5 pt-0 border-t border-[var(--border-subtle)] flex flex-col gap-2.5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--status-success)] pt-2.5">
                  <CheckCircle2 size={14} className="shrink-0" />
                  <span>Approved by everyone (0 vetoes)</span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                    Head-to-Head Matchups:
                  </span>
                  {pairwiseBreakdown.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs"
                    >
                      <span className="font-semibold text-[var(--text-primary)]">
                        Ranked above {item.opponent}
                      </span>
                      <span className="font-bold text-[var(--accent-bg)] px-2 py-0.5 rounded bg-[var(--accent-bg)]/10 tabular-nums">
                        {item.score}
                      </span>
                    </div>
                  ))}
                </div>

                <p className="text-[10px] text-[var(--text-tertiary)] leading-relaxed border-t border-[var(--border-subtle)] pt-2">
                  Scored the highest overall consensus rating across all submitted picks.
                </p>
              </div>
            )}
          </div>

          {/* Inline Quick Star Rating */}
          <div className="w-full flex flex-col items-center gap-2 py-3 border-y border-[var(--border-subtle)]">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              {userRating > 0 ? `Your Rating: ${userRating} / 5 Stars` : 'Rate This Consensus Decision'}
            </span>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleInlineRate(star)}
                  className="p-1 rounded-xl hover:scale-115 active:scale-95 transition-transform cursor-pointer"
                  aria-label={`Rate ${star} stars`}
                >
                  <Star
                    size={22}
                    className={star <= userRating ? 'fill-[var(--status-warning)] text-[var(--status-warning)]' : 'text-[var(--text-tertiary)]'}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2.5 w-full pt-1">
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsReviewOpen(true)}
              icon={MessageSquarePlus}
              className="w-full shadow-md"
            >
              Add Venue Note
            </Button>

            <Button
              variant="secondary"
              size="md"
              onClick={() => navigate('/history')}
              icon={Clock}
              className="w-full"
            >
              View Past Decisions
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
