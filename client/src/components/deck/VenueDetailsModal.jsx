import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  MapPin,
  Navigation,
  Star,
  Car,
  Footprints,
  ExternalLink,
  Camera,
  BookOpen,
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { getVenueRating, getVenueVibe, useVenuePhotos } from '../../utils/venueImages';
import { formatRegionalPriceBadge, formatRegionalDistance } from '../../utils/regionFormat';
import { useLanguage } from '../../context/LanguageContext';
import CleanStreetMiniMap from './CleanStreetMiniMap';
import { markVenueClosedClient } from '../../utils/reportedVenuesClient';
import { triggerHaptic } from '../../utils/haptics';
import useDrawerGesture from '../ui/useDrawerGesture';
import { useVenueInsights } from '../../hooks/useVenueInsights';

export default function VenueDetailsModal({ venue, isOpen, onClose, onVote, onReportClosed, inline = false }) {
  const { t } = useLanguage();
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const touchStartX = useRef(null);

  const { photos = [], photoSlides = [], isRealPhoto, fallbackPhoto } = useVenuePhotos(
    venue?.name,
    venue?.address,
    venue?.category,
    venue?.photo_url
  );
  const { insights } = useVenueInsights(isOpen || inline ? venue?.name : '');

  const handlePrevPhoto = () => {
    if (!photos || photos.length <= 1) return;
    triggerHaptic('tap');
    setActivePhotoIdx((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  };

  const handleNextPhoto = () => {
    if (!photos || photos.length <= 1) return;
    triggerHaptic('tap');
    setActivePhotoIdx((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
  };

  const handleTouchStart = (e) => {
    touchStartX.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current.x;
    const vertical = e.changedTouches[0].clientY - touchStartX.current.y;
    if (Math.abs(diff) > 40 && Math.abs(diff) > Math.abs(vertical)) {
      if (diff > 0) {
        handlePrevPhoto();
      } else {
        handleNextPhoto();
      }
    }
    touchStartX.current = null;
  };

  const [reported, setReported] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose?.();
    }, 180);
  };

  const { panelRef, backdropRef, grabberProps, containerProps } = useDrawerGesture({
    onClose,
    isOpen: isOpen && !inline,
    isClosing,
  });

  useEffect(() => {
    setActivePhotoIdx(0);
    setReported(false);
  }, [venue?.name]);

  useEffect(() => {
    if (!isOpen || inline) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, inline]);

  const handleReportClosed = async () => {
    if (!venue?.name || isReporting) return;
    setIsReporting(true);
    try {
      markVenueClosedClient(venue);
      setReported(true);
      onReportClosed?.(venue);
      setTimeout(() => {
        handleClose();
      }, 700);
    } catch {
      setReported(true);
    } finally {
      setIsReporting(false);
    }
  };

  if (!venue || (!isOpen && !inline)) return null;

  const { rating, reviewCount } = getVenueRating(venue.name, venue.category);
  const vibe = getVenueVibe(venue.name, venue.category);
  const priceLevel = venue.price_level || 2;
  const levelLabel =
    priceLevel === 1
      ? t('budgetLevel1')
      : priceLevel === 2
      ? t('budgetLevel2')
      : priceLevel === 3
      ? t('budgetLevel3')
      : t('budgetLevel4');
  const priceDesc = `${formatRegionalPriceBadge(priceLevel, venue)} • ${levelLabel}`;

  const distKm = venue.road_distance_km || venue.distance_km;
  const distDisplay = formatRegionalDistance(distKm, venue);
  const walkMin = venue.walk_minutes || (distKm != null ? Math.max(2, Math.round(distKm * 12.5)) : null);
  const driveMin = venue.drive_minutes || (distKm != null ? Math.max(2, Math.round(distKm * 2.2)) : null);
  const isWalkable = distKm != null && distKm <= 1.5;

  const hasCoords = venue.lat != null && venue.lng != null && !isNaN(Number(venue.lat)) && !isNaN(Number(venue.lng));
  const latNum = hasCoords ? Number(venue.lat) : null;
  const lngNum = hasCoords ? Number(venue.lng) : null;

  const destinationQuery = encodeURIComponent(`${venue.name} ${venue.address && venue.address !== 'Added by group' ? venue.address : ''}`);
  const driveRouteUrl = venue.googleMapsUrl || (hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${latNum},${lngNum}&travelmode=driving`
    : `https://www.google.com/maps/dir/?api=1&destination=${destinationQuery}&travelmode=driving`);
  const reviewsSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(`${venue.name} ${venue.address || ''} menu reviews photos`)}`;

  const activePhotoUrl = photos[activePhotoIdx] || photos[0] || fallbackPhoto;

  const content = (
    <div className={`relative w-full rounded-t-[28px] sm:rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-main)] shadow-[0_20px_50px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col ${inline ? 'h-full max-h-full min-h-0' : 'max-h-[calc(100dvh-env(safe-area-inset-top,0px)-12px)] sm:max-h-[85dvh]'}`}>
      {/* Consistent Apple Pro-Grade Drag Handle Pill */}
      {!inline && (
        <div
          {...grabberProps}
          className="absolute top-0 inset-x-0 h-8 z-30 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none"
          aria-label="Drag down to dismiss"
        >
          <div className="w-10 h-1 rounded-full bg-white/70 shadow-sm" />
        </div>
      )}

      {/* Interactive Photo Carousel Hero with Touch Swipe & Chevrons */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={() => { touchStartX.current = null; }}
        className={`relative ${inline ? 'h-36 sm:h-44' : 'h-[clamp(156px,27dvh,240px)] sm:h-64'} w-full bg-[var(--bg-inset)] shrink-0 overflow-hidden select-none group`}
      >
        <img
          src={activePhotoUrl}
          alt={venue.name}
          className="w-full h-full object-cover transition-all duration-300"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = fallbackPhoto;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/35 pointer-events-none" />

        {/* Stories-Style Photo Progress Track */}
        {photos.length > 1 && (
          <div className={`absolute ${inline ? 'top-2.5' : 'top-8'} inset-x-3.5 flex items-center gap-1 z-20`}>
            {photos.map((_, i) => (
              <div
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic('tap');
                  setActivePhotoIdx(i);
                }}
                className="flex-1 h-1 rounded-full bg-white/35 backdrop-blur-xs overflow-hidden cursor-pointer"
              >
                <div
                  className={`h-full transition-all duration-200 ${
                    i === activePhotoIdx
                      ? 'bg-white shadow-xs'
                      : i < activePhotoIdx
                      ? 'bg-white/80'
                      : 'bg-transparent'
                  }`}
                />
              </div>
            ))}
          </div>
        )}

        {/* Floating Carousel Navigation Chevrons */}
        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePrevPhoto();
              }}
              aria-label="Previous photo"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/20 flex items-center justify-center transition-all opacity-85 hover:opacity-100 hover:scale-105 active:scale-95 cursor-pointer z-20 shadow-lg"
            >
              <ChevronLeft size={18} strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleNextPhoto();
              }}
              aria-label="Next photo"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/20 flex items-center justify-center transition-all opacity-85 hover:opacity-100 hover:scale-105 active:scale-95 cursor-pointer z-20 shadow-lg"
            >
              <ChevronRight size={18} strokeWidth={2.5} />
            </button>
          </>
        )}

        {/* Carousel Active Dots Indicator */}
        {photos.length > 1 && (
          <div className="absolute bottom-2.5 inset-x-0 flex items-center justify-center gap-1.5 z-20 pointer-events-none">
            {photos.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === activePhotoIdx
                    ? 'w-5 bg-white shadow-xs'
                    : 'w-1.5 bg-white/40'
                }`}
              />
            ))}
          </div>
        )}

        {/* Top Bar Badges */}
        <div className={`absolute ${inline ? 'top-3.5' : 'top-9'} inset-x-3.5 flex items-center justify-between gap-2 z-20`}>
          {/* Yelp / Google Verified Rating Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-white text-xs font-bold tabular-nums shadow-sm">
            <Star size={12} className="text-amber-400 fill-amber-400" />
            <span>{rating}</span>
            <span className="text-white/70 font-normal">({reviewCount})</span>
            <span className="w-1 h-1 rounded-full bg-white/40" />
            <span className="text-[10px] text-emerald-300 font-semibold tracking-wide flex items-center gap-0.5">
              <Check size={10} className="stroke-[3]" />
              <span>Verified</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {photos.length > 1 ? (
              <span className="px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold flex items-center gap-1.5 tabular-nums">
                <Camera size={11} className="text-emerald-400" />
                <span>{activePhotoIdx + 1}/{photos.length}</span>
              </span>
            ) : !isRealPhoto ? (
              <span className="px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-white text-[11px] font-semibold">
                {t('venuePreview')}
              </span>
            ) : null}

            {!inline && onClose && (
              <button
                type="button"
                onClick={handleClose}
                className="w-10 h-10 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-black/90 transition-colors cursor-pointer"
                aria-label="Close Details"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Bottom Title & Vibe on Photo */}
        <div className={`absolute ${photos.length > 1 ? 'bottom-5' : 'bottom-3'} inset-x-4 flex items-end justify-between gap-2 z-10 pointer-events-none`}>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-[var(--accent-bg)] text-white text-[11px] font-bold shadow-xs">
                {vibe}
              </span>
              {photoSlides && photoSlides[activePhotoIdx] && (
                <span className="inline-block px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white/90 text-[10px] font-semibold border border-white/10 truncate max-w-[220px]">
                  {photoSlides[activePhotoIdx].label}
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white leading-tight truncate">
              {venue.name}
            </h2>
          </div>
        </div>
      </div>

      {/* Multi-Photo Thumbnail Switcher (when multiple real photos exist) */}
      {photos.length > 1 && (
        <div className="px-4 py-2 bg-[var(--bg-inset)] border-b border-[var(--border-subtle)] flex items-center gap-2 overflow-x-auto shrink-0">
          {photos.map((url, idx) => (
            <button
              key={url}
              type="button"
              onClick={() => setActivePhotoIdx(idx)}
              className={`relative w-14 h-10 rounded-lg overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                idx === activePhotoIdx
                  ? 'border-[var(--accent-bg)] scale-105 shadow-xs'
                  : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <img
                src={url}
                alt={`${venue.name} ${idx + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </button>
          ))}
          <span className="text-[11px] text-[var(--text-tertiary)] ml-auto shrink-0 font-medium">
            {t('tapToViewPhotos')}
          </span>
        </div>
      )}

      {/* Scrollable Details Body */}
      <div className="venue-details-body p-4 sm:p-5 min-h-0 overflow-y-auto overscroll-contain flex flex-col gap-3">
        {venue.isCustom && !venue.isRoutablePlace && (!venue.address || venue.address === 'Added by group') ? (
          <div className="p-4 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)] flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[var(--accent-bg)]/12 text-[var(--accent-bg)] flex items-center justify-center shrink-0">
                <Star size={18} className="fill-[var(--accent-bg)] text-[var(--accent-bg)]" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-base font-bold text-[var(--text-primary)] leading-tight truncate">
                  {venue.name}
                </span>
                <span className="text-xs text-[var(--text-secondary)] font-medium truncate mt-0.5">
                  {t('customPoll') || 'Custom Poll Option'}
                </span>
              </div>
            </div>

            <a
              href={`https://www.google.com/search?q=${encodeURIComponent(venue.name)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-main)] text-[var(--text-primary)] text-xs font-bold hover:border-[var(--accent-bg)] transition-all active:scale-[0.97]"
            >
              <BookOpen size={14} className="text-[var(--accent-bg)]" />
              <span>Search on Google</span>
              <ExternalLink size={11} className="text-[var(--text-tertiary)]" />
            </a>
          </div>
        ) : (
          <>
            {/* Context-Aware Human-Centric Travel & Spend Capsule */}
            <div className="p-3.5 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)] flex flex-col gap-2.5">
              <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[var(--accent-bg)]/12 text-[var(--accent-bg)] flex items-center justify-center shrink-0">
                    {isWalkable ? (
                      <Footprints size={17} />
                    ) : (
                      <Car size={17} />
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-black text-[var(--text-primary)] leading-tight tabular-nums">
                      {distDisplay
                        ? isWalkable
                          ? `~${walkMin} min • ${distDisplay}`
                          : `~${driveMin} min • ${distDisplay}`
                        : t('localVenue')}
                    </span>
                    <span className="text-[11px] text-[var(--text-secondary)] font-medium truncate">
                      {distKm != null
                        ? isWalkable
                          ? `${t('walking')} (${t('shortDrive').replace('{time}', driveMin)})`
                          : `${t('byCar')} • ${t('viaStreets')}`
                        : t('centralArea')}
                    </span>
                  </div>
                </div>

                <div className="min-w-0 min-[400px]:text-right">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] block">
                    {t('estimatedSpend')}
                  </span>
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    {priceDesc}
                  </span>
                </div>
              </div>

              {/* OSRM Travel Time Pill Badge */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--accent-bg)]/10 text-[var(--accent-bg)] text-xs font-bold border border-[var(--accent-bg)]/20 shadow-xs tabular-nums">
                  <Car size={13} />
                  <span>{driveMin != null ? `~${driveMin} min via OSRM` : 'OSRM Live Routing'}</span>
                </span>
                {isWalkable && walkMin != null && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--bg-elevated)] text-[var(--text-secondary)] text-xs font-semibold border border-[var(--border-subtle)] tabular-nums">
                    <Footprints size={13} className="text-emerald-500" />
                    <span>~{walkMin} min walk</span>
                  </span>
                )}
              </div>

              {/* Clean Address Line */}
              {venue.address && (
                <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <MapPin size={13} className="text-[var(--accent-bg)] shrink-0" />
                  <span className="font-medium break-words min-w-0">{venue.address}</span>
                </div>
              )}
            </div>

            {/* Direct 1-Tap Google Maps Directions & Menu Actions */}
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <a
                href={driveRouteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl bg-[var(--accent-bg)] hover:bg-[var(--accent-bg-hover)] text-white text-xs font-bold shadow-xs transition-all active:scale-[0.97]"
              >
                <Navigation size={14} />
                <span>{t('roadDirections')}</span>
              </a>
              <a
                href={reviewsSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-main)] text-[var(--text-primary)] text-xs font-bold hover:border-[var(--accent-bg)] transition-all active:scale-[0.97]"
              >
                <BookOpen size={14} className="text-[var(--accent-bg)]" />
                <span>{t('menuAndReviews')}</span>
                <ExternalLink size={11} className="text-[var(--text-tertiary)]" />
              </a>
            </div>

            {/* Clean Interactive Street Mini-Map */}
            {hasCoords && (
              <CleanStreetMiniMap
                lat={latNum}
                lng={lngNum}
                venueName={venue.name}
                address={venue.address}
              />
            )}

            {/* Live NoYouPick Community Pulse & Voter Reviews */}
            {insights?.found && insights.totalReviews > 0 && (
              <div className="p-3.5 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)] flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Star size={14} className="fill-amber-400 text-amber-400 shrink-0" />
                    <span className="text-xs font-extrabold text-[var(--text-primary)]">
                      NoYouPick Voter Feedback
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold tabular-nums">
                    {insights.totalReviews} {insights.totalReviews === 1 ? 'voter review' : 'voter reviews'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Satisfaction</span>
                    <span className="text-xs font-black text-amber-500 tabular-nums">★ {insights.satisfactionAvg}/5</span>
                  </div>
                  <div className="px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Price Accuracy</span>
                    <span className="text-xs font-black text-emerald-500 tabular-nums">★ {insights.priceAccuracyAvg}/5</span>
                  </div>
                </div>

                {insights.recentReviews?.some((r) => r.comment) && (
                  <div className="flex flex-col gap-1.5 pt-1">
                    {insights.recentReviews
                      .filter((r) => r.comment)
                      .slice(0, 3)
                      .map((rev) => (
                        <div
                          key={rev.id}
                          className="p-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex flex-col gap-1 text-xs"
                        >
                          <div className="flex items-center justify-between text-[10px] text-[var(--text-tertiary)] font-semibold">
                            <span className="text-amber-500 font-bold">
                              {'★'.repeat(Math.max(1, Math.min(5, Number(rev.satisfactionScore) || 5)))}
                            </span>
                            <span>Verified Voter</span>
                          </div>
                          <p className="text-xs text-[var(--text-primary)] font-medium leading-snug">
                            "{rev.comment}"
                          </p>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Outdated / Closed Venue Flag */}
            <div className="pt-2 border-t border-[var(--border-subtle)] flex flex-wrap gap-2 items-center justify-between text-[11px]">
              <span className="text-[var(--text-tertiary)]">{t('spottedOutdated')}</span>
              {reported ? (
                <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold animate-[fadeIn_0.2s_ease-out]">
                  <Check size={12} />
                  <span>{t('reportedClosed')}</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleReportClosed}
                  disabled={isReporting}
                  aria-label="Report closed venue"
                  className="inline-flex items-center gap-1 text-[var(--text-secondary)] hover:text-rose-400 transition-colors font-medium cursor-pointer active:scale-[0.96]"
                >
                  <AlertTriangle size={12} className="text-amber-500/80" />
                  <span>{isReporting ? t('reporting') : t('reportClosed')}</span>
                </button>
              )}
            </div>
          </>
        )}

        {/* Quick Vote Bar when opened during swiping */}
        {onVote && (
          <div className="pt-2 border-t border-[var(--border-subtle)] grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('pass');
                handleClose();
                onVote(-1);
              }}
              aria-label="Pass option"
              className="py-2.5 px-3 rounded-2xl bg-[var(--bg-inset)] hover:bg-rose-500/10 border border-[var(--border-main)] hover:border-rose-500/40 text-rose-500 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-2xs"
            >
              <X size={15} strokeWidth={2.5} />
              <span>{t('passAction')}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('like');
                handleClose();
                onVote(1);
              }}
              aria-label="Like option"
              className="py-2.5 px-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-xs"
            >
              <Check size={15} strokeWidth={2.5} />
              <span>{t('likeAction')}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (!isOpen && !isClosing && !inline) return null;

  if (inline) {
    return <div className="flex-1 flex flex-col min-h-0 w-full overflow-hidden">{content}</div>;
  }

  return createPortal(
    <div
      ref={backdropRef}
      role="dialog"
      aria-modal="true"
      aria-label={venue.name}
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-xl bg-black/60 transition-opacity duration-200  ${
        isClosing ? 'animate-fade-out' : 'animate-fade-in'
      }`}
      onClick={handleClose}
    >
      <div
        ref={panelRef}
        {...containerProps}
        className={`w-full max-w-lg sm:max-w-md ${
          isClosing ? 'animate-sheet-down sm:animate-scale-down' : 'animate-sheet-up sm:animate-modal-spring'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {content}
      </div>
    </div>,
    document.body
  );
}
