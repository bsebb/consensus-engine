import React, { useState } from 'react';
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
  Route,
  Database,
  Send,
  Info,
} from 'lucide-react';
import Button from '../ui/Button';
import VenueDetailsModal from './VenueDetailsModal';
import { getVenueVibe, getVenueRating, useVenuePhotos } from '../../utils/venueImages';
import { formatTravelSummary } from '../../utils/location';
import { apiUrl } from '../../utils/api';
import { useCustomOptionPhoto } from '../../utils/customOptionService';
import { useToast } from '../ui/Toast';

export default function ConsensusWinnerView({
  mode,
  topic,
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
  pin,
  participantId,
}) {
  const { addToast } = useToast();
  const isCustomWinner = Boolean(mode === 'CUSTOM' || winner?.isCustom);

  const { primaryPhoto, isRealPhoto, fallbackPhoto } = useVenuePhotos(
    isCustomWinner ? '' : winner?.name,
    isCustomWinner ? '' : winner?.address,
    isCustomWinner ? '' : winner?.category,
    isCustomWinner ? null : winner?.photo_url
  );
  const { photo: customWinnerPhoto } = useCustomOptionPhoto(
    isCustomWinner ? winner?.name : '',
    topic,
    winner?.photo_url
  );
  const [customImgErr, setCustomImgErr] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [satisfactionScore, setSatisfactionScore] = useState(userRating || 0);
  const [priceAccuracyScore, setPriceAccuracyScore] = useState(0);
  const [telemetrySubmitted, setTelemetrySubmitted] = useState(false);
  const [isSubmittingTelemetry, setIsSubmittingTelemetry] = useState(false);

  const winnerVibe = getVenueVibe(winner?.name, winner?.category);
  const winnerRating = getVenueRating(winner?.name, winner?.category);
  const travelSummary = formatTravelSummary(winner);

  const handleSelectSatisfaction = (score) => {
    setSatisfactionScore(score);
    if (priceAccuracyScore === 0) setPriceAccuracyScore(score);
    if (handleInlineRate) handleInlineRate(score);
  };

  const handleSubmitTelemetry = async () => {
    const finalSat = satisfactionScore || 5;
    const finalPrice = priceAccuracyScore || finalSat;
    setIsSubmittingTelemetry(true);

    try {
      if (pin && winner?.id) {
        await fetch(apiUrl(`/api/v1/rooms/${pin}/feedback`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            participant_id: participantId || 'anon_user',
            option_id: winner.id,
            satisfaction_score: finalSat,
            price_accuracy_score: finalPrice,
          }),
        });
      }
    } catch (err) {
      console.warn('[ConsensusWinnerView] Telemetry sync notice:', err);
    } finally {
      setIsSubmittingTelemetry(false);
      setTelemetrySubmitted(true);
      addToast({
        title: isCustomWinner ? 'Poll Feedback Saved' : 'Venue Telemetry Saved',
        message: isCustomWinner
          ? `Recorded ${finalSat}/5 group satisfaction for "${winner?.name}".`
          : `Recorded ${finalSat}/5 satisfaction & ${finalPrice}/5 price accuracy for ${winner?.name}.`,
        type: 'success',
      });
    }
  };

  return (
    <main className="px-4 py-4 pb-16 flex flex-col items-center gap-4 flex-1 my-auto max-w-md mx-auto w-full animate-[modalSpring_0.35s_var(--spring-smooth)]">
      {/* Winner Hero Card */}
      <div className="w-full rounded-3xl bg-[var(--bg-elevated)] overflow-hidden shadow-lg border border-[var(--border-main)] flex flex-col text-center">
        {isCustomWinner ? (
          customWinnerPhoto && !customImgErr ? (
            /* Visual Poster Card for Custom Option Winner */
            <div className="relative h-56 w-full bg-[var(--bg-inset)]">
              <img
                src={customWinnerPhoto}
                alt={winner?.name}
                className="w-full h-full object-cover"
                onError={() => setCustomImgErr(true)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/20" />

              {/* Floating Winner Badges */}
              <div className="absolute top-4 inset-x-4 flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-bold shadow-xs">
                  Winning Group Pick
                </span>
                {topic && (
                  <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-xs font-semibold text-white truncate max-w-[180px]">
                    {topic}
                  </span>
                )}
              </div>

              {/* Title overlay */}
              <div className="absolute bottom-4 inset-x-4 text-left">
                <span className="text-xs font-semibold text-amber-300">
                  Consensus Choice
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-0.5 truncate">
                  {winner?.name}
                </h2>
              </div>
            </div>
          ) : (
            /* Clean Custom Poll Winner Banner (Zero Fake Photos, Ratings, Prices, or Distances) */
            <div className="p-6 pb-4 bg-gradient-to-b from-[var(--accent-bg)]/12 to-transparent border-b border-[var(--border-subtle)] flex flex-col items-center gap-2.5">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-bold shadow-xs">
                  Winning Poll Option
                </span>
                {topic && (
                  <span className="px-3 py-1 rounded-full bg-[var(--bg-inset)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-secondary)] truncate max-w-[180px]">
                    {topic}
                  </span>
                )}
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight mt-1 break-words max-w-xs">
                {winner?.name}
              </h2>
            </div>
          )
        ) : (
          /* Discovery Venue Hero Image Header */
          <div className="relative h-56 w-full bg-[var(--bg-inset)]">
            <img
              src={primaryPhoto}
              alt={winner?.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                if (e.currentTarget.src !== fallbackPhoto) {
                  e.currentTarget.src = fallbackPhoto;
                }
              }}
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
            <div className="absolute bottom-4 inset-x-4 text-left flex items-end justify-between gap-2">
              <div className="min-w-0 flex-1">
                <span className="text-xs font-semibold text-amber-300">
                  {isRealPhoto ? `${winnerVibe} • Real Venue Photo` : winnerVibe}
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-0.5 truncate">
                  {winner?.name}
                </h2>
                <div className="flex items-center gap-1.5 text-xs text-zinc-200 mt-1">
                  <MapPin size={13} className="text-amber-400 shrink-0" />
                  <span className="truncate">{winner?.address || 'Local Spot'}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDetailsOpen(true)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/25 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                <Info size={13} />
                <span>Details & Map</span>
              </button>
            </div>
          </div>
        )}

        <div className="p-4 flex flex-col items-center gap-3.5">
          {isCustomWinner ? (
            /* Custom Poll Metrics Row (Group Match + Condorcet Status only) */
            <div className="grid grid-cols-2 gap-2.5 w-full">
              <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)]">
                <span className="text-[10px] font-semibold text-[var(--text-tertiary)]">Group Match</span>
                <span className="text-lg font-black text-emerald-500 tabular-nums">
                  {matchScore}%
                </span>
              </div>
              <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)]">
                <span className="text-[10px] font-semibold text-[var(--text-tertiary)]">Voting Result</span>
                <span className="text-xs font-bold text-[var(--text-primary)] mt-0.5">
                  Condorcet Winner
                </span>
              </div>
            </div>
          ) : (
            <>
              {/* Metrics Row: Match %, Price Tier, Road Distance & Travel Time */}
              <div className="grid grid-cols-3 gap-2 w-full">
                <div className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)]">
                  <span className="text-[10px] font-semibold text-[var(--text-tertiary)]">Group Match</span>
                  <span className="text-base font-black text-emerald-500 tabular-nums">
                    {matchScore}%
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)]">
                  <span className="text-[10px] font-semibold text-[var(--text-tertiary)]">Price Tier</span>
                  <span className="text-base font-bold text-[var(--text-primary)]">
                    {'$'.repeat(winner?.price_level || 2)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setDetailsOpen(true)}
                  className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-[var(--bg-inset)] hover:bg-[var(--bg-surface)] border border-[var(--border-subtle)] transition-colors cursor-pointer"
                >
                  <span className="text-[10px] font-semibold text-[var(--text-tertiary)] flex items-center gap-1">
                    <Route size={10} className="text-[var(--accent-bg)]" />
                    <span>Road Route</span>
                  </span>
                  <span className="text-xs font-bold text-[var(--text-primary)] truncate max-w-[100px] tabular-nums mt-0.5">
                    {travelSummary}
                  </span>
                </button>
              </div>

              {/* Primary Navigation Actions */}
              <div className="grid grid-cols-2 gap-2.5 w-full">
                <a
                  href={mapsDirUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3 px-3 rounded-2xl bg-[var(--accent-bg)] hover:bg-[var(--accent-bg-hover)] text-white flex items-center justify-center gap-1.5 text-xs font-bold transition-all shadow-[0_6px_20px_var(--accent-glow)] cursor-pointer"
                >
                  <Navigation size={14} />
                  <span>Road Directions</span>
                  <ExternalLink size={12} className="opacity-80" />
                </a>

                <button
                  type="button"
                  onClick={() => setDetailsOpen(true)}
                  className="py-3 px-3 rounded-2xl bg-[var(--bg-inset)] hover:bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-main)] flex items-center justify-center gap-1.5 text-xs font-bold transition-colors cursor-pointer"
                >
                  <MapPin size={14} className="text-[var(--accent-bg)]" />
                  <span>Photos & Route Map</span>
                </button>
              </div>
            </>
          )}

          {/* Expandable How Your Group Voted Drawer */}
          <div className="w-full rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)] overflow-hidden text-left">
            <button
              type="button"
              onClick={() => setCondorcetOpen(!condorcetOpen)}
              className="w-full p-3 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              aria-expanded={condorcetOpen}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-[var(--accent-bg)]/10 text-[var(--accent-bg)] flex items-center justify-center">
                  <Sparkles size={14} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    How Your Group Voted
                  </span>
                  <span className="text-[11px] text-[var(--text-tertiary)]">
                    Pairwise Condorcet head-to-head results
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
              <div className="p-3 pt-0 border-t border-[var(--border-subtle)] flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 pt-2">
                  <CheckCircle2 size={14} className="shrink-0 text-emerald-500" />
                  <span>Highest group approval (0 vetoes)</span>
                </div>

                <div className="flex flex-col gap-1.5">
                  {pairwiseBreakdown.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs"
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
        </div>
      </div>

      {/* PROMINENT DATA COLLECTION & VENUE CALIBRATION CTA */}
      <div className="w-full rounded-3xl bg-[var(--bg-elevated)] border-2 border-[var(--accent-bg)]/45 shadow-[0_12px_32px_var(--accent-glow)] p-4 flex flex-col gap-3.5 text-left relative overflow-hidden">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[var(--accent-bg)] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Database size={17} />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black uppercase tracking-wider text-[var(--accent-bg)]">
                  Community Data Collection
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                  Required Step
                </span>
              </div>
              <h3 className="text-sm font-black text-[var(--text-primary)] mt-0.5">
                {isCustomWinner ? `Rate "${winner?.name}" Group Consensus` : `Verify ${winner?.name} & Calibrate Local Data`}
              </h3>
            </div>
          </div>
        </div>

        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          {isCustomWinner
            ? 'Your feedback helps calibrate our group consensus algorithm for custom polls.'
            : 'Your group’s feedback trains our local consensus & price engine so future groups get accurate budget tiers and venue rankings.'}
        </p>

        {telemetrySubmitted ? (
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {isCustomWinner
                    ? `Feedback Recorded (${satisfactionScore || 5}/5 Group Match)`
                    : `Telemetry Recorded (${satisfactionScore || 5}/5 Match • ${priceAccuracyScore || 5}/5 Price)`}
                </span>
                <span className="text-[11px] text-[var(--text-secondary)]">
                  Thank you for contributing to group decision data!
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsReviewOpen(true)}
              className="shrink-0 px-3 py-1.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-main)] text-xs font-bold text-[var(--text-primary)] cursor-pointer"
            >
              Add Note
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {/* Metric 1: Group Decision Satisfaction */}
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)]">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  {isCustomWinner ? 'Group Decision Satisfaction' : '1. Group Pick Satisfaction'}
                </span>
                <span className="text-[10px] text-[var(--text-tertiary)]">
                  {isCustomWinner ? 'Are you happy with this winning option?' : 'Does this spot fit your group?'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleSelectSatisfaction(star)}
                    className="p-1 rounded-lg hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                    aria-label={`Rate satisfaction ${star} stars`}
                  >
                    <Star
                      size={19}
                      className={star <= satisfactionScore ? 'fill-amber-400 text-amber-400' : 'text-[var(--text-tertiary)]'}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Metric 2: Price Tier Accuracy (Discovery Places Only) */}
            {!isCustomWinner && (
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)]">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    2. Price Tier Accuracy ({'$'.repeat(winner?.price_level || 2)})
                  </span>
                  <span className="text-[10px] text-[var(--text-tertiary)]">
                    Is the estimated MDL spend accurate?
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setPriceAccuracyScore(star)}
                      className="p-1 rounded-lg hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                      aria-label={`Rate price accuracy ${star} stars`}
                    >
                      <Star
                        size={19}
                        className={star <= priceAccuracyScore ? 'fill-emerald-400 text-emerald-400' : 'text-[var(--text-tertiary)]'}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Primary Data Collection Submit Button */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                disabled={isSubmittingTelemetry}
                onClick={handleSubmitTelemetry}
                className="flex-1 py-3.5 px-4 rounded-2xl bg-[var(--accent-bg)] hover:bg-[var(--accent-bg-hover)] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-[0_6px_20px_var(--accent-glow)] transition-all cursor-pointer disabled:opacity-60"
              >
                <Send size={14} />
                <span>
                  {isSubmittingTelemetry
                    ? 'Saving Feedback...'
                    : satisfactionScore > 0
                    ? 'Submit Feedback & Complete'
                    : 'Quick-Submit 5/5 Feedback'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsReviewOpen(true)}
                className="py-3.5 px-3.5 rounded-2xl bg-[var(--bg-inset)] hover:bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-main)] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Open Detailed Feedback Form"
              >
                <MessageSquarePlus size={15} />
                <span>Full Form</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Start New Room Action */}
      <div className="w-full">
        <Button
          variant="secondary"
          size="md"
          onClick={() => navigate('/')}
          icon={RotateCcw}
          className="w-full rounded-2xl"
        >
          Start Another Group Decision
        </Button>
      </div>

      {/* Full Venue Details & Route Modal (Discovery Places Only) */}
      {!isCustomWinner && (
        <VenueDetailsModal
          venue={winner}
          isOpen={detailsOpen}
          onClose={() => setDetailsOpen(false)}
        />
      )}
    </main>
  );
}

