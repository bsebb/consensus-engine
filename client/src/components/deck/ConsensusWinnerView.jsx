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
import StatusBadge from '../ui/StatusBadge';
import MilledTray from '../ui/MilledTray';
import Button from '../ui/Button';
import { getVenueImage, getVenueVibe } from '../../utils/venueImages';

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
  const distanceLabel = winner?.distance_km != null ? `${winner.distance_km} km` : (winner?.address || 'Chișinău');

  return (
    <main className="px-4 py-6 pb-12 flex flex-col items-center gap-5 flex-1 my-auto animate-[modalSpring_0.4s_var(--spring-smooth)]">
      <div className="w-full rounded-2xl bg-[var(--bg-elevated)] overflow-hidden shadow-xl border border-[var(--border-main)] flex flex-col text-center">
        {/* Winner Hero Image Header */}
        <div className="relative h-48 w-full bg-[var(--bg-inset)]">
          <img
            src={winnerImage}
            alt={winner?.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

          {/* Floating Trophy & Status Pill */}
          <div className="absolute top-3 inset-x-3 flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-black/60 backdrop-blur-md text-[var(--status-warning)] flex items-center justify-center shadow-lg">
              <Trophy size={22} />
            </div>
            <StatusBadge status="success" label="Consensus Achieved" pulse size="sm" />
          </div>

          {/* Title overlay */}
          <div className="absolute bottom-3 inset-x-4 text-left">
            <span className="text-[11px] font-bold text-amber-300 drop-shadow-sm uppercase tracking-wider">
              {winnerVibe}
            </span>
            <h2 className="text-2xl font-black text-white tracking-tight drop-shadow-md">
              {winner?.name}
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-white/90 drop-shadow-sm mt-0.5">
              <MapPin size={12} className="text-[var(--accent-bg)]" />
              <span>{winner?.address || 'Centru, Chișinău'}</span>
            </div>
          </div>
        </div>

        <div className="p-5 flex flex-col items-center gap-4">
          <p className="text-xs text-[var(--text-secondary)]">
            Pairwise Condorcet & Schulze Consensus Result
          </p>

          {/* Metrics Row */}
          <div className="grid grid-cols-3 gap-2 w-full">
            <MilledTray className="flex flex-col items-center justify-center p-2.5">
              <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Match</span>
              <span className="text-sm font-extrabold text-[var(--status-success)] font-mono">
                {matchScore}%
              </span>
            </MilledTray>

            <MilledTray className="flex flex-col items-center justify-center p-2.5">
              <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Price</span>
              <span className="text-sm font-bold text-[var(--text-primary)] font-mono">
                {'$'.repeat(winner?.price_level || 2)}
              </span>
            </MilledTray>

            <MilledTray className="flex flex-col items-center justify-center p-2.5">
              <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Location</span>
              <span className="text-xs font-bold text-[var(--text-primary)] truncate max-w-[85px]">
                {distanceLabel}
              </span>
            </MilledTray>
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
                    Why Did This Win? (Pairwise Condorcet Graph)
                  </span>
                  <span className="text-[10px] text-[var(--text-tertiary)]">
                    Head-to-head margins & quorum audit
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
                  <span>0 Vetoes Received (Unanimous Quorum)</span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                    Head-to-Head Margins:
                  </span>
                  {pairwiseBreakdown.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs"
                    >
                      <span className="font-semibold text-[var(--text-primary)]">
                        Beat {item.opponent}
                      </span>
                      <span className="font-mono font-bold text-[var(--accent-bg)] px-2 py-0.5 rounded bg-[var(--accent-bg)]/10">
                        {item.score}
                      </span>
                    </div>
                  ))}
                </div>

                <p className="text-[10px] text-[var(--text-tertiary)] leading-relaxed border-t border-[var(--border-subtle)] pt-2">
                  Schulze Path Matrix: Defeated every candidate in direct head-to-head ballots with zero veto overrides.
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
              Detailed Feedback
            </Button>

            <Button
              variant="secondary"
              size="md"
              onClick={() => navigate('/history')}
              icon={Clock}
              className="w-full"
            >
              View Decision Ledger
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
