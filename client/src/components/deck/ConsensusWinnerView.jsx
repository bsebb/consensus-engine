import React, { useState, useEffect } from 'react';
import {
  Navigation,
  ExternalLink,
  BarChart3,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  Star,
  RotateCcw,
  MapPin,
  Route,
  Info,
  Sparkles,
  Compass,
  Share2,
} from 'lucide-react';
import Button from '../ui/Button';
import VenueDetailsModal from './VenueDetailsModal';
import WinnerFeedbackCard from './WinnerFeedbackCard';
import { getVenueVibe, getVenueRating, useVenuePhotos } from '../../utils/venueImages';
import { formatTravelSummary } from '../../utils/location';
import { formatRegionalPricePill } from '../../utils/regionFormat';
import { apiUrl } from '../../utils/api';
import { useCustomOptionPhoto, isLogoImage } from '../../utils/customOptionService';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../ui/Toast';
import { triggerHaptic } from '../../utils/haptics';

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
  deviceId,
  emit,
}) {
  const { addToast } = useToast();
  const { lang, t } = useLanguage();
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

  useEffect(() => {
    triggerHaptic('victory');
  }, []);

  const winnerVibe = getVenueVibe(winner?.name, winner?.category);
  const winnerRating = getVenueRating(winner?.name, winner?.category);
  const travelSummary = formatTravelSummary(winner, lang);

  const winnerDest = encodeURIComponent((winner?.name || '') + ' ' + (winner?.address || ''));
  const googleMapsUrl = mapsDirUrl && mapsDirUrl !== '#'
    ? mapsDirUrl
    : `https://www.google.com/maps/dir/?api=1&destination=${winnerDest}`;
  const appleMapsUrl = `https://maps.apple.com/?daddr=${winnerDest}`;

  const handleSelectSatisfaction = (score) => {
    triggerHaptic('tap');
    setSatisfactionScore(score);
    if (priceAccuracyScore === 0) setPriceAccuracyScore(score);
    if (handleInlineRate) handleInlineRate(score);
  };

  const handleShareWinner = async () => {
    triggerHaptic('tap');
    const shareData = {
      title: `Consensus Pick: ${winner?.name}`,
      text: `Our group chose ${winner?.name}!`,
      url: window.location.href,
    };
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(window.location.href);
      addToast({
        title: t('copied') || 'Copied',
        message: t('linkCopied') || 'Link copied to clipboard',
        type: 'success',
      });
    } catch {}
  };

  const handleSubmitTelemetry = async () => {
    const finalSat = satisfactionScore || 5;
    const finalPrice = priceAccuracyScore || finalSat;
    setIsSubmittingTelemetry(true);
    triggerHaptic('like');

    try {
      if (pin && (winner?.id || winner?.name)) {
        const res = await fetch(apiUrl(`/api/v1/rooms/${pin}/feedback`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            participant_id: participantId || 'anon_user',
            device_id: deviceId || undefined,
            option_id: winner?.id || `winner_${pin}`,
            option_name: winner?.name || 'Consensus Pick',
            satisfaction_score: finalSat,
            price_accuracy_score: finalPrice,
          }),
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
      }
      setTelemetrySubmitted(true);
      addToast({
        title: isCustomWinner ? 'Poll Feedback Saved' : t('feedbackSaved') || 'Rating Saved',
        message: isCustomWinner
          ? `Recorded ${finalSat}/5 group satisfaction for "${winner?.name}".`
          : `Recorded ${finalSat}/5 satisfaction & ${finalPrice}/5 price accuracy for ${winner?.name}.`,
        type: 'success',
      });
    } catch (err) {
      console.warn('[ConsensusWinnerView] Telemetry sync notice:', err);
      setTelemetrySubmitted(true);
      addToast({
        title: t('feedbackSaved') || 'Rating Saved',
        message: t('thanksFeedback') || 'Thank you for sharing your feedback!',
        type: 'info',
      });
    } finally {
      setIsSubmittingTelemetry(false);
    }
  };

  const handleStartAnother = () => {
    triggerHaptic('tap');
    if (pin) {
      if (typeof emit === 'function') {
        emit('leave_lobby', {
          pin,
          participant_id: participantId,
        });
      }
      localStorage.removeItem('consensus_active_pin');
      sessionStorage.removeItem('consensus_active_pin');
      sessionStorage.removeItem(`consensus_host_${pin}`);
    }
    navigate('/');
  };

  return (
    <main className="winner-scroll px-4 py-3 pb-6 flex flex-col items-center gap-3.5 flex-1 min-h-0 overflow-y-auto overscroll-contain max-w-md mx-auto w-full animate-[modalSpring_0.35s_var(--spring-smooth)]">
      {/* Winner Hero Card */}
      <div className="w-full shrink-0 rounded-3xl bg-[var(--bg-elevated)] overflow-hidden shadow-lg border border-[var(--border-main)] flex flex-col text-center">
        {isCustomWinner ? (
          customWinnerPhoto && !customImgErr ? (
            /* Visual Poster Card for Custom Option Winner */
            <div className={`relative h-[clamp(170px,26dvh,224px)] w-full ${isLogoImage(customWinnerPhoto) ? 'bg-zinc-900' : 'bg-[var(--bg-inset)]'}`}>
              <img
                src={customWinnerPhoto}
                alt={winner?.name}
                className={isLogoImage(customWinnerPhoto) ? 'w-full h-full object-contain p-6 pb-12' : 'w-full h-full object-cover'}
                onError={() => setCustomImgErr(true)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/20" />

              {/* Floating Winner Badges */}
              <div className="absolute top-4 inset-x-4 flex items-center justify-between gap-2 min-w-0">
                <span className="px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-bold shadow-xs shrink-0">
                  {t('winningGroupPick')}
                </span>
                {topic && (
                  <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-xs font-semibold text-white truncate max-w-[150px] shrink min-w-0 text-right" title={topic}>
                    {topic}
                  </span>
                )}
              </div>

              {/* Title overlay */}
              <div className="absolute bottom-4 inset-x-4 text-left">
                <span className="text-xs font-semibold text-amber-300">
                  {t('consensusChoice')}
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-0.5 truncate">
                  {winner?.name}
                </h2>
              </div>
            </div>
          ) : (
            /* Clean Custom Poll Winner Banner */
            <div className="p-6 pb-4 bg-gradient-to-b from-[var(--accent-bg)]/12 to-transparent border-b border-[var(--border-subtle)] flex flex-col items-center gap-2.5">
              <div className="flex items-center justify-center gap-2 max-w-full px-2 min-w-0">
                <span className="px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-bold shadow-xs shrink-0">
                  {t('winningPollOption')}
                </span>
                {topic && (
                  <span className="px-3 py-1 rounded-full bg-[var(--bg-inset)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-secondary)] truncate max-w-[150px] shrink min-w-0" title={topic}>
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
          <div className="relative h-[clamp(170px,26dvh,224px)] w-full bg-[var(--bg-inset)]">
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

            {/* Floating Rating & Glowing Winner Badge */}
            <div className="absolute top-4 inset-x-4 flex items-center justify-between">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md text-xs font-bold text-amber-300 border border-white/15 shadow-md tabular-nums">
                <Star size={13} className="fill-amber-300 text-amber-300" />
                <span>{winnerRating.rating}</span>
                <span className="text-[11px] text-white/80 font-normal">({winnerRating.reviewCount})</span>
              </div>
              <div className="animate-match-badge-glow flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-black shadow-[0_0_18px_rgba(16,185,129,0.45)]">
                <Sparkles size={13} />
                <span>{matchScore || 96}% {t('match')}</span>
              </div>
            </div>

            {/* Title overlay */}
            <div className="absolute bottom-3 inset-x-3 text-left flex flex-wrap items-end justify-between gap-2">
              <div className="min-w-0 flex-1">
                <span className="text-xs font-semibold text-amber-300">
                  {isRealPhoto ? `${winnerVibe} • ${t('realVenuePhoto')}` : winnerVibe}
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-0.5 truncate">
                  {winner?.name}
                </h2>
                <div className="flex items-center gap-1.5 text-xs text-zinc-200 mt-1">
                  <MapPin size={13} className="text-amber-400 shrink-0" />
                  <span className="truncate">{winner?.address || t('localVenue')}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDetailsOpen(true)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/25 text-white text-xs font-bold transition-all cursor-pointer active:scale-[0.98]"
              >
                <Info size={13} />
                <span>{t('detailsAndRoute')}</span>
              </button>
            </div>
          </div>
        )}

        <div className="p-4 flex flex-col items-center gap-3.5">
          {isCustomWinner ? (
            /* Custom Poll Metrics Row (Group Match + Condorcet Status only) */
            <div className="grid grid-cols-2 gap-2.5 w-full">
              <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)]">
                <span className="text-[10px] font-semibold text-[var(--text-tertiary)]">{t('groupMatch')}</span>
                <span className="text-lg font-black text-emerald-500 tabular-nums">
                  {matchScore}%
                </span>
              </div>
              <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)]">
                <span className="text-[10px] font-semibold text-[var(--text-tertiary)]">{t('votingResult')}</span>
                <span className="text-xs font-bold text-[var(--text-primary)] mt-0.5">
                  {t('condorcetWinner')}
                </span>
              </div>
            </div>
          ) : (
            <>
              {/* Metrics Row: Match %, Price Tier, Road Distance & Travel Time */}
              <div className="grid grid-cols-3 gap-2 w-full">
                <div className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)]">
                  <span className="text-[10px] font-semibold text-[var(--text-tertiary)]">{t('groupMatch')}</span>
                  <span className="text-base font-black text-emerald-500 tabular-nums">
                    {matchScore}%
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)]">
                  <span className="text-[10px] font-semibold text-[var(--text-tertiary)]">{t('priceTierLabel')}</span>
                  <span className="text-xs font-bold text-[var(--text-primary)] mt-0.5 tabular-nums">
                    {formatRegionalPricePill(winner?.price_level || 2, winner)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setDetailsOpen(true)}
                  className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-[var(--bg-inset)] hover:bg-[var(--bg-surface)] border border-[var(--border-subtle)] transition-colors cursor-pointer active:scale-[0.98]"
                >
                  <span className="text-[10px] font-semibold text-[var(--text-tertiary)] flex items-center gap-1">
                    <Route size={10} className="text-[var(--accent-bg)]" />
                    <span>{t('roadRoute')}</span>
                  </span>
                  <span className="text-xs font-bold text-[var(--text-primary)] max-w-full px-1 tabular-nums mt-0.5 leading-snug">
                    {travelSummary}
                  </span>
                </button>
              </div>

              {/* Primary Directions Actions: Google Maps & Apple Maps */}
              <div className="grid grid-cols-2 gap-2.5 w-full">
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => triggerHaptic('tap')}
                  className="py-3 px-3 rounded-2xl bg-[var(--accent-bg)] hover:bg-[var(--accent-bg-hover)] text-white flex items-center justify-center gap-1.5 text-xs font-bold transition-all shadow-[0_6px_20px_var(--accent-glow)] active:scale-[0.98] cursor-pointer"
                  title="Direct Google Maps directions"
                >
                  <Navigation size={14} />
                  <span>Google Maps</span>
                  <ExternalLink size={11} className="opacity-75" />
                </a>

                <a
                  href={appleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => triggerHaptic('tap')}
                  className="py-3 px-3 rounded-2xl bg-[var(--bg-inset)] hover:bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-main)] flex items-center justify-center gap-1.5 text-xs font-bold transition-all active:scale-[0.98] cursor-pointer"
                  title="Direct Apple Maps directions"
                >
                  <Compass size={14} className="text-[var(--accent-bg)]" />
                  <span>Apple Maps</span>
                  <ExternalLink size={11} className="opacity-75 text-[var(--text-tertiary)]" />
                </a>
              </div>
            </>
          )}

          {/* Share Button */}
          <button
            type="button"
            onClick={handleShareWinner}
            aria-label={t('shareWinner') || 'Share Result with Group'}
            className="w-full py-2.5 px-3 rounded-2xl bg-[var(--bg-inset)] hover:bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] flex items-center justify-center gap-2 text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer"
          >
            <Share2 size={14} />
            <span>{t('shareWinner') || 'Share Result with Group'}</span>
          </button>

          {/* Expandable How Your Group Voted Drawer */}
          <div className="w-full rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)] overflow-hidden text-left">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                setCondorcetOpen(!condorcetOpen);
              }}
              className="w-full p-3 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              aria-expanded={condorcetOpen}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-[var(--accent-bg)]/10 text-[var(--accent-bg)] flex items-center justify-center">
                  <BarChart3 size={14} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    {t('howGroupVoted')}
                  </span>
                  <span className="text-[11px] text-[var(--text-tertiary)]">
                    {t('headToHeadResults')}
                  </span>
                </div>
              </div>
              {condorcetOpen ? (
                <ChevronUp size={16} className="text-[var(--text-tertiary)]" />
              ) : (
                <ChevronDown size={16} className="text-[var(--text-tertiary)]" />
              )}
            </button>

            <div className={`accordion-drawer ${condorcetOpen ? 'open' : ''}`}>
              <div className="accordion-drawer-inner">
                <div className="p-3 pt-0 border-t border-[var(--border-subtle)] flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 pt-2">
                    <CheckCircle2 size={14} className="shrink-0 text-emerald-500" />
                    <span>{t('highestApproval')}</span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    {pairwiseBreakdown.length > 0 ? (
                      pairwiseBreakdown.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs"
                        >
                          <span className="font-medium text-[var(--text-primary)]">
                            {t('preferredOver')} {item.opponent}
                          </span>
                          <span className="font-bold text-[var(--text-secondary)] px-2 py-0.5 rounded-md bg-[var(--bg-inset)] tabular-nums">
                            {item.score}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-2 text-xs text-[var(--text-tertiary)]">
                        {t('highestApproval')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Community Data Collection & Feedback */}
      <WinnerFeedbackCard
        isCustomWinner={isCustomWinner}
        winner={winner}
        satisfactionScore={satisfactionScore}
        priceAccuracyScore={priceAccuracyScore}
        telemetrySubmitted={telemetrySubmitted}
        isSubmittingTelemetry={isSubmittingTelemetry}
        handleSelectSatisfaction={handleSelectSatisfaction}
        setPriceAccuracyScore={setPriceAccuracyScore}
        handleSubmitTelemetry={handleSubmitTelemetry}
        setIsReviewOpen={setIsReviewOpen}
      />

      {/* Start New Room Action */}
      <div className="w-full shrink-0">
        <Button
          variant="secondary"
          size="md"
          onClick={handleStartAnother}
          icon={RotateCcw}
          className="w-full rounded-2xl active:scale-[0.98] transition-transform"
        >
          {t('startAnotherPick')}
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
