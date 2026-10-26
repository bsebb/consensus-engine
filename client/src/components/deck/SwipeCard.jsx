import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  ThumbsUp, ThumbsDown, Ban, Star, Route, Info,
  Layers, MapPin,
} from 'lucide-react';
import { getVenueVibe, useVenuePhotos } from '../../utils/venueImages';
import { useCustomOptionPhoto, isLogoImage } from '../../utils/customOptionService';
import { useLanguage } from '../../context/LanguageContext';
import { triggerHaptic } from '../../utils/haptics';

export default function SwipeCard({
  mode, topic, cardIndex = 1, activeCard, dragOffset, exitDirection, enterDirection,
  isDragging, cardRef, handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel,
  cardRating, cardReviewCount, cardPriceDesc, cardWalkDesc, onOpenDetails, onRegisterCardTap,
}) {
  const { t } = useLanguage();
  const localCardRef = useRef(null);

  const setCombinedRef = useCallback((node) => {
    localCardRef.current = node;
    if (typeof cardRef === 'function') cardRef(node);
  }, [cardRef]);

  const isCustomCard = Boolean(mode === 'CUSTOM' || activeCard?.isCustom);
  const isRoutable = Boolean(activeCard?.isRoutablePlace || (activeCard?.address && activeCard?.address !== 'Added by group'));
  const useRealVenueGallery = !isCustomCard || isRoutable;

  const { photo: customPhoto } = useCustomOptionPhoto(
    isCustomCard && !isRoutable ? activeCard?.name : '',
    topic,
    activeCard?.photo_url
  );
  const { primaryPhoto, photoSlides, fallbackPhoto } = useVenuePhotos(
    useRealVenueGallery ? activeCard?.name : '',
    useRealVenueGallery ? activeCard?.address : '',
    useRealVenueGallery ? activeCard?.category : '',
    useRealVenueGallery ? activeCard?.photo_url : null
  );

  const [photoIdx, setPhotoIdx] = useState(0);
  const [failedUrls, setFailedUrls] = useState({});
  const [customImgError, setCustomImgError] = useState(false);

  useEffect(() => {
    setPhotoIdx(0);
    setFailedUrls({});
    setCustomImgError(false);
  }, [activeCard?.id, activeCard?.name, cardIndex]);

  const vibeSubtitle = getVenueVibe(activeCard?.name, activeCard?.category);

  const validSlides = useMemo(() => {
    const slides = (photoSlides || []).filter((s) => s?.url && !failedUrls[s.url]);
    if (slides.length > 0) return slides;
    return [{ url: fallbackPhoto || primaryPhoto, label: 'Spot Overview', detail: `${vibeSubtitle || 'Local Venue'} • Signature atmosphere` }];
  }, [photoSlides, failedUrls, fallbackPhoto, primaryPhoto, vibeSubtitle]);

  const safePhotoIdx = validSlides.length > 0 ? photoIdx % validSlides.length : 0;
  const activeSlide = validSlides[safePhotoIdx] || validSlides[0];
  const displayPhoto = (!useRealVenueGallery && customPhoto) ? customPhoto : (activeSlide?.url || primaryPhoto || fallbackPhoto);

  const handlePrevPhoto = useCallback((e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (validSlides.length <= 1) return;
    triggerHaptic('tap');
    setPhotoIdx((prev) => (prev > 0 ? prev - 1 : validSlides.length - 1));
  }, [validSlides.length]);

  const handleNextPhoto = useCallback((e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (validSlides.length <= 1) return;
    triggerHaptic('tap');
    setPhotoIdx((prev) => (prev + 1) % validSlides.length);
  }, [validSlides.length]);

  // Handle stationary tap from gesture engine without blocking card swiping
  useEffect(() => {
    onRegisterCardTap?.(({ clientX, clientY, target }) => {
      // 1. If clicked explicit details trigger:
      if (target?.closest?.('[data-details-trigger="true"]')) {
        triggerHaptic('tap');
        onOpenDetails?.(safePhotoIdx);
        return;
      }

      // 2. Measure tap location relative to card
      const rect = localCardRef.current?.getBoundingClientRect();
      if (!rect) return;
      const relX = clientX - rect.left;
      const relY = clientY - rect.top;

      // Bottom 30% of the card is the venue details overlay
      if (relY > rect.height * 0.70) {
        triggerHaptic('tap');
        onOpenDetails?.(safePhotoIdx);
        return;
      }

      // Top 70% is photo navigation: tap left third for prev, right third for next
      if (validSlides.length > 1) {
        if (relX < rect.width * 0.45) {
          handlePrevPhoto();
        } else {
          handleNextPhoto();
        }
      }
    });
  }, [onRegisterCardTap, safePhotoIdx, onOpenDetails, validSlides.length, handlePrevPhoto, handleNextPhoto]);

  useEffect(() => {
    if (!useRealVenueGallery || validSlides.length <= 1) return;
    const onKey = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;
      if (e.key === ']' || e.key === ' ') {
        e.preventDefault();
        handleNextPhoto();
      } else if (e.key === '[') {
        e.preventDefault();
        handlePrevPhoto();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [useRealVenueGallery, validSlides.length, handleNextPhoto, handlePrevPhoto]);

  // Directional Drag Stamps with opacity proportional to commit threshold
  const likeProgress = Math.min(1, Math.max(0, (dragOffset.x - 10) / 60));
  const passProgress = Math.min(1, Math.max(0, (-dragOffset.x - 10) / 60));
  const isVertical = Math.abs(dragOffset.y) > Math.abs(dragOffset.x) * 0.85;
  const vetoProgress = isVertical ? Math.min(1, Math.max(0, (dragOffset.y - 25) / 60)) : 0;
  const superlikeProgress = isVertical ? Math.min(1, Math.max(0, (-dragOffset.y - 20) / 55)) : 0;

  const enterClass = enterDirection ? `animate-card-fly-in-${enterDirection}` : '';
  const cardTransform = exitDirection === 'right'
    ? `translate3d(140%, ${dragOffset.y * 0.4}px, 0) rotate(18deg)`
    : exitDirection === 'left'
    ? `translate3d(-140%, ${dragOffset.y * 0.4}px, 0) rotate(-18deg)`
    : exitDirection === 'down'
    ? 'translate3d(0, 140%, 0) scale(0.92)'
    : exitDirection === 'up'
    ? 'translate3d(0, -140%, 0) scale(0.92)'
    : `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0) rotate(${dragOffset.x * 0.08}deg)`;

  return (
    <main className="px-3 sm:px-4 py-0.5 sm:py-1 flex flex-col justify-center flex-1 min-h-0 h-full max-w-md mx-auto w-full select-none swipe-card-viewport">
      <div
        ref={setCombinedRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        style={{
          transform: cardTransform,
          transition: exitDirection
            ? 'transform 0.28s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.24s ease-out'
            : isDragging
            ? 'none'
            : 'transform 0.38s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.22s ease-out',
          opacity: exitDirection ? 0 : 1,
          touchAction: 'none',
          willChange: isDragging ? 'transform' : 'auto',
        }}
        className={`w-full h-full min-h-0 rounded-3xl bg-[var(--bg-elevated)] shadow-[0_16px_40px_rgba(0,0,0,0.12)] border border-[var(--border-main)] relative cursor-grab active:cursor-grabbing flex flex-col overflow-hidden touch-none select-none ${enterClass}`}
      >
        {/* Vector 1: LIKE Stamp (Right) */}
        {likeProgress > 0 && (
          <div
            style={{ opacity: Math.min(1, likeProgress * 1.25), transform: `scale(${0.8 + likeProgress * 0.3}) rotate(-12deg)` }}
            className="absolute top-6 right-6 px-4 py-1.5 rounded-2xl border-2 border-emerald-500 bg-emerald-950/85 text-emerald-400 font-bold text-sm tracking-wide backdrop-blur-md flex items-center gap-1.5 z-30 pointer-events-none select-none shadow-[0_6px_24px_rgba(16,185,129,0.35)] origin-top-right transition-none"
          >
            <ThumbsUp size={16} strokeWidth={2.5} />
            <span>{t('likeAction') || 'LIKE'}</span>
          </div>
        )}

        {/* Vector 2: PASS Stamp (Left) */}
        {passProgress > 0 && (
          <div
            style={{ opacity: Math.min(1, passProgress * 1.25), transform: `scale(${0.8 + passProgress * 0.3}) rotate(12deg)` }}
            className="absolute top-6 left-6 px-4 py-1.5 rounded-2xl border-2 border-rose-500 bg-rose-950/85 text-rose-400 font-bold text-sm tracking-wide backdrop-blur-md flex items-center gap-1.5 z-30 pointer-events-none select-none shadow-[0_6px_24px_rgba(244,63,94,0.35)] origin-top-left transition-none"
          >
            <ThumbsDown size={16} strokeWidth={2.5} />
            <span>{t('passAction') || 'PASS'}</span>
          </div>
        )}

        {/* Vector 3: VETO Stamp (Down) */}
        {vetoProgress > 0 && (
          <div
            style={{ opacity: vetoProgress, transform: `scale(${0.88 + vetoProgress * 0.2})` }}
            className="absolute inset-x-12 top-7 py-2 rounded-2xl border-2 border-red-700 bg-red-950/90 text-red-300 font-bold text-sm tracking-wide backdrop-blur-md flex items-center justify-center gap-2 z-30 pointer-events-none select-none shadow-[0_6px_24px_rgba(185,28,28,0.45)] origin-top transition-none"
          >
            <Ban size={18} strokeWidth={2.6} />
            <span>{t('vetoAction') || 'VETO'}</span>
          </div>
        )}

        {/* Vector 4: SUPERLIKE Stamp (Up) */}
        {superlikeProgress > 0 && (
          <div
            style={{ opacity: superlikeProgress, transform: `scale(${0.88 + superlikeProgress * 0.2})` }}
            className="absolute inset-x-12 bottom-7 py-2 rounded-2xl border-2 border-amber-400 bg-amber-950/85 text-amber-300 font-bold text-sm tracking-wide backdrop-blur-md flex items-center justify-center gap-2 z-30 pointer-events-none select-none shadow-[0_6px_24px_rgba(251,191,36,0.35)] origin-bottom transition-none"
          >
            <Star size={16} strokeWidth={2.5} className="fill-amber-300" />
            <span>{t('superlikeAction') || 'SUPERLIKE'}</span>
          </div>
        )}

        {isCustomCard && !isRoutable ? (
          customPhoto && !customImgError ? (
            <div className={`relative w-full h-full min-h-0 flex-1 overflow-hidden ${isLogoImage(customPhoto) ? 'bg-zinc-900' : 'bg-[var(--bg-inset)]'}`}>
              <img
                src={customPhoto}
                alt={activeCard?.name}
                className={`${isLogoImage(customPhoto) ? 'w-full h-full object-contain p-10 pb-24' : 'absolute inset-0 w-full h-full object-cover'} pointer-events-none select-none`}
                draggable="false"
                onError={() => setCustomImgError(true)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent pointer-events-none" />
              <div
                data-details-trigger="true"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic('tap');
                  onOpenDetails?.(0);
                }}
                className="absolute bottom-3.5 inset-x-3.5 p-3.5 rounded-2xl bg-black/65 backdrop-blur-xl border border-white/15 text-white flex items-center justify-between gap-2 z-20 cursor-pointer shadow-lg group hover:bg-black/75 transition-colors"
                title="Tap for option details"
              >
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight line-clamp-2 group-hover:underline">
                  {activeCard?.name}
                </h2>
                {onOpenDetails && (
                  <button
                    type="button"
                    data-standalone="true"
                    data-details-trigger="true"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic('tap');
                      onOpenDetails(0);
                    }}
                    className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-semibold backdrop-blur-sm transition-colors active:scale-95 cursor-pointer shadow-xs"
                  >
                    <Info size={13} />
                    <span>{t('details')}</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="w-full h-full min-h-0 flex-1 flex flex-col justify-between p-6 text-center bg-gradient-to-b from-[var(--bg-elevated)] to-[var(--bg-inset)]">
              <div className="flex items-center justify-center pointer-events-none">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent-bg)]/12 text-[var(--accent-bg)] text-xs font-bold truncate max-w-[85%]">
                  <Layers size={12} />
                  <span className="truncate">{topic || 'Custom Poll'}</span>
                </span>
              </div>
              <div
                data-details-trigger="true"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic('tap');
                  onOpenDetails?.(0);
                }}
                className="my-auto py-8 px-2 flex flex-col items-center gap-3 cursor-pointer group"
                title="Tap for option details"
              >
                <div className="w-14 h-14 rounded-2xl bg-[var(--accent-bg)]/12 border border-[var(--accent-bg)]/25 text-[var(--accent-bg)] flex items-center justify-center text-xl font-bold tabular-nums shadow-xs group-hover:scale-105 transition-transform pointer-events-none">
                  #{cardIndex}
                </div>
                <div className="flex items-center gap-1.5 justify-center">
                  <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight leading-tight max-w-xs break-words group-hover:underline line-clamp-2">{activeCard?.name}</h2>
                  <Info size={16} className="text-[var(--text-tertiary)] group-hover:text-[var(--accent-bg)] shrink-0" />
                </div>
              </div>
              <div className="pt-2 border-t border-[var(--border-subtle)] text-xs font-medium text-[var(--text-tertiary)] flex items-center justify-between px-2 shrink-0">
                <div className="flex items-center gap-2">
                  <span>{t('swipeRightApprove')}</span>
                  <span>•</span>
                  <span>{t('swipeLeftDecline')}</span>
                </div>
                {onOpenDetails && (
                  <button
                    type="button"
                    data-standalone="true"
                    data-details-trigger="true"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic('tap');
                      onOpenDetails(0);
                    }}
                    aria-label="View option details"
                    className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--bg-surface)] border border-[var(--border-main)] text-[var(--text-primary)] text-xs font-semibold transition-all cursor-pointer active:scale-95 shadow-2xs"
                  >
                    <Info size={12} className="text-[var(--accent-bg)]" />
                    <span>{t('details')}</span>
                  </button>
                )}
              </div>
            </div>
          )
        ) : (
          <div className="relative w-full h-full min-h-0 flex-1 bg-[var(--bg-inset)] overflow-hidden select-none">
            <img
              key={displayPhoto}
              src={displayPhoto}
              alt={activeCard?.name || 'Venue'}
              className="absolute inset-0 w-full h-full object-cover animate-[fadeIn_0.22s_ease-out] pointer-events-none select-none"
              draggable="false"
              onError={(e) => {
                const fallbackNext = validSlides[(safePhotoIdx + 1) % validSlides.length]?.url || fallbackPhoto;
                setFailedUrls((prev) => ({ ...prev, [displayPhoto]: true }));
                if (fallbackNext && e.currentTarget.src !== fallbackNext) e.currentTarget.src = fallbackNext;
              }}
            />
            {/* Deep bottom scrim reserving 130px for clear contrast over any photo */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

            {/* Story indicators at top (only shown if venue has >1 photo) */}
            {validSlides.length > 1 && (
              <div className="absolute top-2.5 inset-x-4 flex items-center gap-1.5 z-25 pointer-events-none">
                {validSlides.slice(0, 4).map((slide, idx) => (
                  <div
                    key={slide.url || idx}
                    className={`h-1.5 flex-1 rounded-full transition-all ${
                      idx === safePhotoIdx
                        ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]'
                        : idx < safePhotoIdx
                        ? 'bg-white/65'
                        : 'bg-white/30'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Top Rating Badge */}
            <div className="absolute top-4 right-4 z-20 pointer-events-none">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-md text-xs font-bold text-amber-300 border border-white/10 tabular-nums">
                <Star size={13} className="fill-amber-300 text-amber-300" />
                <span>{cardRating}</span>
                <span className="text-[11px] text-white/75 font-normal">({cardReviewCount})</span>
              </div>
            </div>

            {/* Unified Frosted Glass Bottom Overlay: Venue Name (up to 2 lines) + Single Line Subtitle */}
            <div
              data-details-trigger="true"
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic('tap');
                onOpenDetails?.(safePhotoIdx);
              }}
              className="absolute bottom-3 inset-x-3.5 p-3.5 rounded-2xl bg-black/65 backdrop-blur-xl border border-white/15 text-white flex flex-col gap-1.5 z-20 cursor-pointer shadow-lg group hover:bg-black/75 transition-colors"
              title="Tap for venue details, map & photos"
            >
              <div className="flex items-start justify-between gap-2 min-w-0">
                <h2 className="min-w-0 flex-1 text-xl sm:text-2xl font-bold text-white tracking-tight line-clamp-2 leading-snug group-hover:underline">
                  {activeCard?.name}
                </h2>
                {onOpenDetails && (
                  <button
                    type="button"
                    data-standalone="true"
                    data-details-trigger="true"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic('tap');
                      onOpenDetails(safePhotoIdx);
                    }}
                    aria-label="View venue details"
                    className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-semibold backdrop-blur-sm transition-all active:scale-95 cursor-pointer shadow-xs mt-0.5"
                  >
                    <Info size={13} />
                    <span>{t('details')}</span>
                  </button>
                )}
              </div>

              {/* Single-line Subtitle: Cuisine · Price · Distance */}
              <div className="flex items-center gap-2 text-xs font-medium text-white/80 min-w-0 overflow-hidden">
                <span className="text-white/90 truncate shrink-0 max-w-[120px]">
                  {activeCard?.category || vibeSubtitle || t('localVenue')}
                </span>
                <span className="text-white/40 shrink-0">•</span>
                <span className="font-semibold text-white tabular-nums shrink-0">{cardPriceDesc}</span>
                <span className="text-white/40 shrink-0">•</span>
                <span className="flex items-center gap-1 tabular-nums text-white/90 shrink-0 truncate">
                  <Route size={12} className="text-[var(--accent-bg)] shrink-0" />
                  <span>{cardWalkDesc}</span>
                </span>
                {activeCard?.address && cardWalkDesc !== activeCard.address.split(',')[0] && (
                  <>
                    <span className="text-white/40 hidden min-[380px]:inline shrink-0">•</span>
                    <span className="hidden min-[380px]:flex items-center gap-1 text-white/75 truncate min-w-0">
                      <MapPin size={11} className="text-amber-400 shrink-0" />
                      <span className="truncate">{activeCard.address.split(',')[0]}</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
