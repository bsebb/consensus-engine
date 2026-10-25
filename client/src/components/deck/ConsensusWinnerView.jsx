import React, { useState, useEffect, useMemo } from 'react';
import {
  Navigation, ExternalLink, BarChart3, ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  CheckCircle2, Star, RotateCcw, MapPin, Route, Info, Sparkles, Compass, Share2, Heart,
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
import { invalidateClientVenueInsights } from '../../hooks/useVenueInsights';
import {
  savePendingCheckin, schedulePostVisitReminder, recordLocalFeedback, getPendingCheckin,
} from '../../utils/checkinReminder';

const FAVORITES_KEY = 'consensus_favorites';

export default function ConsensusWinnerView({
  mode, topic, winner, matchScore, mapsDirUrl, condorcetOpen, setCondorcetOpen,
  pairwiseBreakdown = [], userRating, handleInlineRate, setIsReviewOpen,
  navigate, pin, participantId, deviceId, emit, onQuickRematch,
}) {
  const { addToast } = useToast();
  const { lang, t } = useLanguage();
  const isCustomWinner = Boolean(mode === 'CUSTOM' || winner?.isCustom);
  const isRoutable = Boolean(winner?.isRoutablePlace || (winner?.address && winner?.address !== 'Added by group'));
  const useRealVenueDisplay = !isCustomWinner || isRoutable;

  const { primaryPhoto, photoSlides, fallbackPhoto } = useVenuePhotos(
    useRealVenueDisplay ? winner?.name : '',
    useRealVenueDisplay ? winner?.address : '',
    useRealVenueDisplay ? winner?.category : '',
    useRealVenueDisplay ? (winner?.photo_url || null) : null
  );
  const { photo: customWinnerPhoto } = useCustomOptionPhoto(
    isCustomWinner && !isRoutable ? winner?.name : '',
    topic,
    winner?.photo_url
  );

  const [customImgErr, setCustomImgErr] = useState(false);
  const [winnerPhotoIdx, setWinnerPhotoIdx] = useState(0);
  const [failedUrls, setFailedUrls] = useState({});
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [satisfactionScore, setSatisfactionScore] = useState(userRating || 0);
  const [priceAccuracyScore, setPriceAccuracyScore] = useState(0);
  const [telemetrySubmitted, setTelemetrySubmitted] = useState(Boolean(userRating && userRating > 0));
  const [isSubmittingTelemetry, setIsSubmittingTelemetry] = useState(false);
  const [insightsRefreshKey, setInsightsRefreshKey] = useState(0);
  const [reminderScheduled, setReminderScheduled] = useState(() => Boolean(getPendingCheckin()?.reminderRequested));
  const [isFavorite, setIsFavorite] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
      return Array.isArray(saved) && saved.some((f) => f.name === winner?.name);
    } catch { return false; }
  });

  useEffect(() => {
    if (winner?.name && !telemetrySubmitted) {
      savePendingCheckin({ pin, winnerName: winner.name, optionId: winner.id || `winner_${pin}` });
    }
  }, [pin, winner?.name, winner?.id, telemetrySubmitted]);

  useEffect(() => {
    if (userRating && userRating > 0) {
      setSatisfactionScore(userRating);
      setTelemetrySubmitted(true);
      setInsightsRefreshKey((prev) => prev + 1);
    }
  }, [userRating]);

  useEffect(() => { triggerHaptic('victory'); }, []);

  const winnerVibe = getVenueVibe(winner?.name, winner?.category);
  const winnerRating = getVenueRating(winner?.name, winner?.category);
  const travelSummary = formatTravelSummary(winner, lang);

  const validSlides = useMemo(() => {
    const slides = (photoSlides || []).filter((s) => s?.url && !failedUrls[s.url]);
    if (slides.length > 0) return slides;
    return [{ url: primaryPhoto || fallbackPhoto, label: 'Spot Overview', detail: `${winnerVibe || 'Local Spot'} • Winning group pick` }];
  }, [photoSlides, failedUrls, primaryPhoto, fallbackPhoto, winnerVibe]);

  const safeWinnerIdx = validSlides.length > 0 ? winnerPhotoIdx % validSlides.length : 0;
  const activeSlide = validSlides[safeWinnerIdx] || validSlides[0];
  const heroPhotoUrl = activeSlide?.url || primaryPhoto || fallbackPhoto;

  const winnerDest = encodeURIComponent((winner?.name || '') + ' ' + (winner?.address || ''));
  const googleMapsUrl = winner?.googleMapsUrl || (mapsDirUrl && mapsDirUrl !== '#' ? mapsDirUrl : `https://www.google.com/maps/dir/?api=1&destination=${winnerDest}`);
  const appleMapsUrl = winner?.appleMapsUrl || `https://maps.apple.com/?daddr=${winnerDest}`;

  const handleToggleFavorite = () => {
    triggerHaptic('like');
    try {
      const saved = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
      const list = Array.isArray(saved) ? saved : [];
      const exists = list.some((f) => f.name === winner?.name);
      const next = exists
        ? list.filter((f) => f.name !== winner?.name)
        : [{ name: winner?.name, address: winner?.address || 'Local Spot', category: winner?.category || winnerVibe, priceLevel: winner?.price_level || 2, savedAt: new Date().toISOString() }, ...list].slice(0, 30);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      setIsFavorite(!exists);
      addToast({
        title: !exists ? 'Saved to Favorites' : 'Removed from Favorites',
        message: !exists ? `${winner?.name} bookmarked for future group picks.` : `${winner?.name} removed from saved spots.`,
        type: 'success',
      });
    } catch {}
  };

  const handleSelectSatisfaction = (score) => {
    triggerHaptic('tap');
    setSatisfactionScore(score);
    if (priceAccuracyScore === 0) setPriceAccuracyScore(score);
  };

  const handleShareWinner = async () => {
    triggerHaptic('tap');
    const addrLine = winner?.address && winner.address !== 'Added by group' ? `\nAddress: ${winner.address}` : '';
    const shareText = `Group Consensus Pick: ${winner?.name} (${matchScore || 96}% match on NoYouPick!)${addrLine}`;
    const shareUrl = window.location.origin;
    const shareData = { title: `Consensus Pick: ${winner?.name}`, text: shareText, url: shareUrl };
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try { await navigator.share(shareData); return; } catch {}
    }
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      addToast({ title: t('copied') || 'Copied', message: t('linkCopied') || 'Result & link copied to clipboard', type: 'success' });
    } catch {}
  };

  const handleSubmitTelemetry = async () => {
    const finalSat = satisfactionScore || 5;
    const finalPrice = priceAccuracyScore || finalSat;
    setSatisfactionScore(finalSat);
    setPriceAccuracyScore(finalPrice);
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
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      }
      recordLocalFeedback({
        pin, winnerName: winner?.name || 'Consensus Pick', optionId: winner?.id || `winner_${pin}`,
        participantId, deviceId, satisfactionScore: finalSat, priceAccuracyScore: finalPrice,
      });
      if (handleInlineRate) handleInlineRate(finalSat);
      invalidateClientVenueInsights(winner?.name);
      setInsightsRefreshKey((prev) => prev + 1);
      setTelemetrySubmitted(true);
      addToast({
        title: isCustomWinner ? 'Poll Feedback Saved' : t('feedbackSaved') || 'Rating Saved',
        message: isCustomWinner ? `Recorded ${finalSat}/5 group satisfaction for "${winner?.name}".` : `Recorded ${finalSat}/5 satisfaction & ${finalPrice}/5 price accuracy for ${winner?.name}.`,
        type: 'success',
      });
    } catch (err) {
      console.warn('[ConsensusWinnerView] Telemetry sync notice:', err);
      setTelemetrySubmitted(true);
      addToast({ title: t('feedbackSaved') || 'Rating Saved', message: t('thanksFeedback') || 'Thank you for sharing your feedback!', type: 'info' });
    } finally {
      setIsSubmittingTelemetry(false);
    }
  };

  const handleScheduleReminder = async () => {
    triggerHaptic('like');
    await schedulePostVisitReminder({
      pin, winnerName: winner?.name || 'Consensus Pick', optionId: winner?.id || `winner_${pin}`, delayMinutes: 90,
    });
    setReminderScheduled(true);
    addToast({ title: 'Post-Visit Reminder Set', message: `We'll prompt you to rate ${winner?.name} after your outing!`, type: 'success' });
  };

  const handleStartAnother = () => {
    triggerHaptic('tap');
    if (pin) {
      if (typeof emit === 'function') emit('leave_lobby', { pin, participant_id: participantId });
      localStorage.removeItem('consensus_active_pin');
      sessionStorage.removeItem('consensus_active_pin');
      sessionStorage.removeItem(`consensus_host_${pin}`);
    }
    navigate('/');
  };

  return (
    <main className="winner-scroll w-full flex-1 min-h-0 overflow-y-auto overscroll-contain no-scrollbar px-4 py-3 pb-8">
      <div className="max-w-md mx-auto w-full flex flex-col items-center gap-3.5 animate-[fadeIn_0.25s_ease-out]">
      {/* Winner Hero Card */}
      <div className="w-full shrink-0 rounded-3xl bg-[var(--bg-elevated)] overflow-hidden shadow-lg border border-[var(--border-main)] flex flex-col text-center">
        {isCustomWinner && !isRoutable ? (
          customWinnerPhoto && !customImgErr ? (
            <div className={`relative h-[clamp(160px,23dvh,210px)] w-full ${isLogoImage(customWinnerPhoto) ? 'bg-zinc-900' : 'bg-[var(--bg-inset)]'}`}>
              <img
                src={customWinnerPhoto}
                alt={winner?.name}
                className={isLogoImage(customWinnerPhoto) ? 'w-full h-full object-contain p-6 pb-12' : 'w-full h-full object-cover'}
                onError={() => setCustomImgErr(true)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/20" />
              <div className="absolute top-4 inset-x-4 flex items-center justify-between gap-2 min-w-0">
                <span className="px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-bold shadow-xs shrink-0">{t('winningGroupPick')}</span>
                {topic && (
                  <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-xs font-semibold text-white truncate max-w-[150px] shrink min-w-0 text-right" title={topic}>
                    {topic}
                  </span>
                )}
              </div>
              <div className="absolute bottom-4 inset-x-4 text-left">
                <span className="text-xs font-semibold text-amber-300">{t('consensusChoice')}</span>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-0.5 truncate">{winner?.name}</h2>
              </div>
            </div>
          ) : (
            <div className="p-6 pb-4 bg-gradient-to-b from-[var(--accent-bg)]/12 to-transparent border-b border-[var(--border-subtle)] flex flex-col items-center gap-2.5">
              <div className="flex items-center justify-center gap-2 max-w-full px-2 min-w-0">
                <span className="px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-bold shadow-xs shrink-0">{t('winningPollOption')}</span>
                {topic && (
                  <span className="px-3 py-1 rounded-full bg-[var(--bg-inset)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-secondary)] truncate max-w-[150px] shrink min-w-0" title={topic}>
                    {topic}
                  </span>
                )}
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight mt-1 break-words max-w-xs">{winner?.name}</h2>
            </div>
          )
        ) : (
          /* Discovery Venue 4-Photo Interactive Hero & Strip */
          <>
            <div className="relative h-[clamp(175px,25dvh,230px)] w-full bg-[var(--bg-inset)] overflow-hidden select-none">
              <img
                key={heroPhotoUrl}
                src={heroPhotoUrl}
                alt={winner?.name}
                className="w-full h-full object-cover animate-[fadeIn_0.22s_ease-out]"
                onError={(e) => {
                  const nextUrl = validSlides[(safeWinnerIdx + 1) % validSlides.length]?.url || fallbackPhoto;
                  setFailedUrls((prev) => ({ ...prev, [heroPhotoUrl]: true }));
                  if (nextUrl && e.currentTarget.src !== nextUrl) e.currentTarget.src = nextUrl;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/20 pointer-events-none" />

              {validSlides.length > 1 && (
                <div className="absolute top-2.5 inset-x-4 flex items-center gap-1.5 z-20">
                  {validSlides.slice(0, 4).map((slide, idx) => (
                    <button
                      key={slide.url || idx}
                      type="button"
                      onClick={() => { triggerHaptic('tap'); setWinnerPhotoIdx(idx); }}
                      aria-label={`View winner photo ${idx + 1}: ${slide.label}`}
                      className={`h-1.5 flex-1 rounded-full transition-all cursor-pointer ${
                        idx === safeWinnerIdx ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.85)]' : idx < safeWinnerIdx ? 'bg-white/65 hover:bg-white/85' : 'bg-white/30 hover:bg-white/55'
                      }`}
                    />
                  ))}
                </div>
              )}

              {validSlides.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => { triggerHaptic('tap'); setWinnerPhotoIdx((prev) => (prev > 0 ? prev - 1 : validSlides.length - 1)); }}
                    aria-label="Previous photo"
                    className="absolute left-2.5 top-[42%] -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/85 backdrop-blur-md text-white border border-white/20 flex items-center justify-center transition-all cursor-pointer z-20 active:scale-95 shadow-md"
                  >
                    <ChevronLeft size={16} strokeWidth={2.5} />
                  </button>
                  <button
                    type="button"
                    onClick={() => { triggerHaptic('tap'); setWinnerPhotoIdx((prev) => (prev + 1) % validSlides.length); }}
                    aria-label="Next photo"
                    className="absolute right-2.5 top-[42%] -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/85 backdrop-blur-md text-white border border-white/20 flex items-center justify-center transition-all cursor-pointer z-20 active:scale-95 shadow-md"
                  >
                    <ChevronRight size={16} strokeWidth={2.5} />
                  </button>
                </>
              )}

              <div className={`absolute ${validSlides.length > 1 ? 'top-6' : 'top-4'} inset-x-4 flex items-center justify-between z-10`}>
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

              <div className="absolute bottom-3.5 inset-x-4 text-left flex items-end justify-between gap-2.5 z-10">
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-amber-300 block">
                    {winner?.category || winnerVibe}
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-0.5 truncate">{winner?.name}</h2>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-200 mt-0.5">
                    <MapPin size={13} className="text-amber-400 shrink-0" />
                    <span className="truncate">{winner?.address || t('localVenue')}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setDetailsOpen(true)}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/65 hover:bg-black/80 backdrop-blur-md border border-white/25 text-white text-xs font-bold transition-all cursor-pointer active:scale-[0.98]"
                >
                  <Info size={13} />
                  <span>{t('details') || 'Details'}</span>
                </button>
              </div>
            </div>

            {validSlides.length > 1 && (
              <div className="px-4 py-2.5 bg-[var(--bg-inset)] border-b border-[var(--border-subtle)]">
                <div className="grid grid-cols-4 gap-2">
                  {validSlides.slice(0, 4).map((slide, idx) => (
                    <button
                      key={slide.url || idx}
                      type="button"
                      onClick={() => { triggerHaptic('tap'); setWinnerPhotoIdx(idx); }}
                      aria-label={`Photo ${idx + 1}`}
                      className={`relative h-12 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                        idx === safeWinnerIdx ? 'border-[var(--accent-bg)] ring-2 ring-[var(--accent-bg)]/25 shadow-xs' : 'border-transparent opacity-65 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={slide.url}
                        alt={`${winner?.name} - ${idx + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => { if (fallbackPhoto && e.currentTarget.src !== fallbackPhoto) e.currentTarget.src = fallbackPhoto; }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="p-4 flex flex-col items-center gap-3">
          {isCustomWinner && !isRoutable ? (
            <div className="grid grid-cols-2 gap-2.5 w-full">
              <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)]">
                <span className="text-[10px] font-semibold text-[var(--text-tertiary)]">{t('groupMatch')}</span>
                <span className="text-lg font-black text-emerald-500 tabular-nums">{matchScore}%</span>
              </div>
              <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)]">
                <span className="text-[10px] font-semibold text-[var(--text-tertiary)]">{t('votingResult')}</span>
                <span className="text-xs font-bold text-[var(--text-primary)] mt-0.5">{t('condorcetWinner')}</span>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2.5 w-full">
                <div className="flex flex-col items-start justify-center px-3.5 py-2.5 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)] text-left">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-tertiary)]">
                    {t('priceTierLabel')}
                  </span>
                  <span className="text-xs sm:text-sm font-black text-[var(--text-primary)] mt-0.5 tabular-nums">
                    {formatRegionalPricePill(winner?.price_level || 2, winner)}
                  </span>
                </div>
                <div className="flex flex-col items-start justify-center px-3.5 py-2.5 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)] text-left">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-tertiary)] flex items-center gap-1">
                    <Route size={10} className="text-[var(--accent-bg)]" />
                    <span>{t('roadRoute')}</span>
                  </span>
                  <span className="text-xs sm:text-sm font-black text-[var(--text-primary)] tabular-nums mt-0.5 leading-snug">
                    {travelSummary}
                  </span>
                </div>
              </div>

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

          {/* Retention Action Bar: Share Result + Save to Favorites */}
          <div className="grid grid-cols-2 gap-2.5 w-full">
            <button
              type="button"
              onClick={handleShareWinner}
              aria-label={t('shareWinner') || 'Share Result with Group'}
              className="py-2.5 px-3 rounded-2xl bg-[var(--bg-inset)] hover:bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] flex items-center justify-center gap-1.5 text-xs font-bold transition-all active:scale-[0.98] cursor-pointer"
            >
              <Share2 size={14} className="text-[var(--accent-bg)] shrink-0" />
              <span className="truncate">{t('shareWinnerBtn') || 'Share Winner'}</span>
            </button>
            <button
              type="button"
              onClick={handleToggleFavorite}
              aria-label={isFavorite ? t('savedSpot') : t('saveFavorite')}
              className={`py-2.5 px-3 rounded-2xl border flex items-center justify-center gap-1.5 text-xs font-bold transition-all active:scale-[0.98] cursor-pointer ${
                isFavorite ? 'bg-rose-500/12 border-rose-500/35 text-rose-500' : 'bg-[var(--bg-inset)] hover:bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-primary)]'
              }`}
            >
              <Heart size={14} className={isFavorite ? 'fill-rose-500 text-rose-500 shrink-0' : 'text-rose-500 shrink-0'} />
              <span className="truncate">{isFavorite ? t('savedSpot') : t('saveFavorite')}</span>
            </button>
          </div>

          {/* Expandable How Your Group Voted Drawer */}
          <div className="w-full rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)] overflow-hidden text-left">
            <button
              type="button"
              onClick={() => { triggerHaptic('selection'); setCondorcetOpen(!condorcetOpen); }}
              className="w-full p-3 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              aria-expanded={condorcetOpen}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-[var(--accent-bg)]/10 text-[var(--accent-bg)] flex items-center justify-center">
                  <BarChart3 size={14} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[var(--text-primary)]">{t('howGroupVoted')}</span>
                  <span className="text-[11px] text-[var(--text-tertiary)]">{t('headToHeadResults')}</span>
                </div>
              </div>
              {condorcetOpen ? <ChevronUp size={16} className="text-[var(--text-tertiary)]" /> : <ChevronDown size={16} className="text-[var(--text-tertiary)]" />}
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
                        <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs">
                          <span className="font-medium text-[var(--text-primary)]">{t('preferredOver')} {item.opponent}</span>
                          <span className="font-bold text-[var(--text-secondary)] px-2 py-0.5 rounded-md bg-[var(--bg-inset)] tabular-nums">{item.score}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-2 text-xs text-[var(--text-tertiary)]">{t('highestApproval')}</div>
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
        insightsRefreshKey={insightsRefreshKey}
        reminderScheduled={reminderScheduled}
        onScheduleReminder={handleScheduleReminder}
      />

      {/* Post-Match Retention Loop: Quick Runner-Up Rematch or Start Another Pick */}
      <div className="w-full shrink-0 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {onQuickRematch && (
          <Button
            variant="secondary"
            size="md"
            onClick={onQuickRematch}
            icon={Sparkles}
            className="w-full rounded-2xl active:scale-[0.98] transition-transform"
          >
            {t('runnerUpRematch')}
          </Button>
        )}
        <Button
          variant="secondary"
          size="md"
          onClick={handleStartAnother}
          icon={RotateCcw}
          className={`w-full rounded-2xl active:scale-[0.98] transition-transform ${!onQuickRematch ? 'sm:col-span-2' : ''}`}
        >
          {t('startAnotherPick')}
        </Button>
      </div>

      {(!isCustomWinner || isRoutable) && (
        <VenueDetailsModal
          venue={winner}
          isOpen={detailsOpen}
          initialPhotoIdx={safeWinnerIdx}
          onClose={() => setDetailsOpen(false)}
        />
      )}
      </div>
    </main>
  );
}
