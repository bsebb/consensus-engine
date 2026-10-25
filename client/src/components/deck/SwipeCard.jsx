import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ThumbsUp, ThumbsDown, Flame, Star, MapPin, Route, Info,
  Layers, ChevronLeft, ChevronRight, Camera, Sparkles, X,
} from 'lucide-react';
import { getVenueVibe, useVenuePhotos } from '../../utils/venueImages';
import { useCustomOptionPhoto, isLogoImage } from '../../utils/customOptionService';
import { useLanguage } from '../../context/LanguageContext';
import { triggerHaptic } from '../../utils/haptics';

export default function SwipeCard({
  mode, topic, cardIndex = 1, activeCard, dragOffset, exitDirection, enterDirection,
  isDragging, cardRef, handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel,
  cardRating, cardReviewCount, cardPriceDesc, cardWalkDesc, onOpenDetails,
}) {
  const { t } = useLanguage();
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
  const photoTapRef = useRef(null);
  const [showGestureHint, setShowGestureHint] = useState(() => {
    try { return !localStorage.getItem('consensus_seen_swipe_hint'); } catch { return true; }
  });

  const dismissGestureHint = () => {
    setShowGestureHint(false);
    try { localStorage.setItem('consensus_seen_swipe_hint', 'true'); } catch {}
  };

  useEffect(() => {
    setPhotoIdx(0);
    setFailedUrls({});
    setCustomImgError(false);
    if (cardIndex > 1 && showGestureHint) dismissGestureHint();
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

  useEffect(() => {
    if (!useRealVenueGallery || validSlides.length <= 1) return;
    const onKey = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;
      if (e.key === ']' || e.key === ' ') {
        e.preventDefault();
        triggerHaptic('tap');
        setPhotoIdx((prev) => (prev + 1) % validSlides.length);
      } else if (e.key === '[') {
        e.preventDefault();
        triggerHaptic('tap');
        setPhotoIdx((prev) => (prev > 0 ? prev - 1 : validSlides.length - 1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [useRealVenueGallery, validSlides.length]);

  const handlePhotoSurfacePointerDown = (e) => {
    photoTapRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
  };

  const handlePhotoSurfacePointerUp = (e) => {
    if (!photoTapRef.current) return;
    const dx = Math.abs(e.clientX - photoTapRef.current.x);
    const dy = Math.abs(e.clientY - photoTapRef.current.y);
    const dt = Date.now() - photoTapRef.current.time;
    photoTapRef.current = null;
    if (dx < 10 && dy < 10 && dt < 420 && validSlides.length > 1) {
      const rect = e.currentTarget.getBoundingClientRect();
      const relX = e.clientX - rect.left;
      triggerHaptic('tap');
      if (relX < rect.width * 0.45) setPhotoIdx((prev) => (prev > 0 ? prev - 1 : validSlides.length - 1));
      else setPhotoIdx((prev) => (prev + 1) % validSlides.length);
    }
  };

  const likeProgress = Math.min(1, Math.max(0, (dragOffset.x - 6) / 64));
  const passProgress = Math.min(1, Math.max(0, (-dragOffset.x - 6) / 64));
  const isVertical = Math.abs(dragOffset.x) < 55;
  const vetoProgress = isVertical ? Math.min(1, Math.max(0, (dragOffset.y - 65) / 70)) : 0;
  const superlikeProgress = isVertical ? Math.min(1, Math.max(0, (-dragOffset.y - 35) / 65)) : 0;

  const enterClass = enterDirection ? `animate-card-fly-in-${enterDirection}` : '';
  const cardTransform = exitDirection === 'right'
    ? `translate3d(140%, ${dragOffset.y * 0.4}px, 0) rotate(16deg)`
    : exitDirection === 'left'
    ? `translate3d(-140%, ${dragOffset.y * 0.4}px, 0) rotate(-16deg)`
    : exitDirection === 'down'
    ? 'translate3d(0, 140%, 0) scale(0.92)'
    : exitDirection === 'up'
    ? 'translate3d(0, -140%, 0) scale(0.92)'
    : `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0) rotate(${dragOffset.x * 0.05}deg)`;

  return (
    <main className="px-3 sm:px-4 py-0.5 sm:py-1 flex flex-col justify-center flex-1 min-h-0 max-w-md mx-auto w-full select-none swipe-card-viewport">
      <div
        ref={cardRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        style={{
          transform: cardTransform,
          transition: exitDirection
            ? 'transform 0.26s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.24s ease-out'
            : isDragging
            ? 'none'
            : 'transform 0.42s cubic-bezier(0.34, 1.4, 0.64, 1), opacity 0.22s ease-out',
          opacity: exitDirection ? 0 : 1,
          touchAction: 'none',
          willChange: isDragging ? 'transform' : 'auto',
        }}
        className={`w-full flex-1 min-h-0 rounded-3xl bg-[var(--bg-elevated)] shadow-[0_16px_40px_rgba(0,0,0,0.12)] border border-[var(--border-main)] relative my-auto cursor-grab active:cursor-grabbing flex flex-col overflow-hidden touch-none select-none ${enterClass}`}
      >
        {likeProgress > 0 && (
          <div
            style={{ opacity: Math.min(1, likeProgress * 1.25), transform: `scale(${0.76 + likeProgress * 0.34}) rotate(-12deg)` }}
            className="absolute top-6 right-6 px-4 py-1.5 rounded-2xl border-2 border-emerald-500 bg-emerald-950/85 text-emerald-400 font-bold text-sm tracking-wide backdrop-blur-md flex items-center gap-1.5 z-30 pointer-events-none select-none shadow-[0_6px_24px_rgba(16,185,129,0.35)] origin-top-right transition-none"
          >
            <ThumbsUp size={16} strokeWidth={2.5} />
            <span>{t('likeAction')}</span>
          </div>
        )}
        {passProgress > 0 && (
          <div
            style={{ opacity: Math.min(1, passProgress * 1.25), transform: `scale(${0.76 + passProgress * 0.34}) rotate(12deg)` }}
            className="absolute top-6 left-6 px-4 py-1.5 rounded-2xl border-2 border-rose-500 bg-rose-950/85 text-rose-400 font-bold text-sm tracking-wide backdrop-blur-md flex items-center gap-1.5 z-30 pointer-events-none select-none shadow-[0_6px_24px_rgba(244,63,94,0.35)] origin-top-left transition-none"
          >
            <ThumbsDown size={16} strokeWidth={2.5} />
            <span>{t('passAction')}</span>
          </div>
        )}
        {vetoProgress > 0 && (
          <div
            style={{ opacity: vetoProgress, transform: `scale(${0.88 + vetoProgress * 0.2})` }}
            className="absolute inset-x-12 top-7 py-2 rounded-2xl border-2 border-red-600 bg-red-950/90 text-red-400 font-bold text-sm tracking-wide backdrop-blur-md flex items-center justify-center gap-2 z-30 pointer-events-none select-none shadow-[0_6px_24px_rgba(220,38,38,0.35)] origin-top transition-none"
          >
            <Flame size={16} strokeWidth={2.5} />
            <span>{t('vetoAction')}</span>
          </div>
        )}
        {superlikeProgress > 0 && (
          <div
            style={{ opacity: superlikeProgress, transform: `scale(${0.88 + superlikeProgress * 0.2})` }}
            className="absolute inset-x-12 bottom-7 py-2 rounded-2xl border-2 border-amber-400 bg-amber-950/85 text-amber-300 font-bold text-sm tracking-wide backdrop-blur-md flex items-center justify-center gap-2 z-30 pointer-events-none select-none shadow-[0_6px_24px_rgba(251,191,36,0.35)] origin-bottom transition-none"
          >
            <Star size={16} strokeWidth={2.5} className="fill-amber-300" />
            <span>{t('superlikeAction') || 'Superlike'}</span>
          </div>
        )}

        {cardIndex === 1 && showGestureHint && (
          <div
            onClick={dismissGestureHint}
            className="absolute bottom-16 sm:bottom-20 inset-x-4 z-40 py-2 px-3 rounded-full bg-black/85 backdrop-blur-xl border border-white/20 text-white shadow-2xl flex items-center justify-between gap-2 animate-bounce-subtle cursor-pointer select-none"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles size={14} className="text-amber-400 shrink-0" />
              <span className="text-[11px] font-bold tracking-tight truncate">
                {t('swipeHintPill') || 'Swipe right to Like • Left to Pass • Tap for details'}
              </span>
            </div>
            <span className="w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center shrink-0 transition-colors">
              <X size={12} strokeWidth={2.5} />
            </span>
          </div>
        )}

        {isCustomCard && !isRoutable ? (
          customPhoto && !customImgError ? (
            <>
              <div className={`relative flex-1 min-h-0 w-full overflow-hidden ${isLogoImage(customPhoto) ? 'bg-zinc-900' : 'bg-[var(--bg-inset)]'}`}>
                <img
                  src={customPhoto}
                  alt={activeCard?.name}
                  className={`${isLogoImage(customPhoto) ? 'w-full h-full object-contain p-10 pb-24' : 'w-full h-full object-cover'} pointer-events-none select-none`}
                  draggable="false"
                  onError={() => setCustomImgError(true)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10 pointer-events-none" />
                <div className="absolute top-4 inset-x-4 flex items-center justify-between z-10 pointer-events-none">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-xs font-semibold text-white border border-white/10 max-w-[85%] truncate">
                    <Layers size={12} className="text-amber-400 shrink-0" />
                    <span className="truncate">{topic || 'Custom Poll'}</span>
                  </span>
                </div>
                <div
                  onClick={(e) => {
                    if (Math.hypot(dragOffset.x, dragOffset.y) > 8) return;
                    e.stopPropagation();
                    triggerHaptic('tap');
                    onOpenDetails?.(0);
                  }}
                  className="absolute bottom-3.5 inset-x-4 text-left flex flex-col gap-1 z-10 cursor-pointer group"
                  title="Tap for option details"
                >
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight line-clamp-2 group-hover:underline">{activeCard?.name}</h2>
                    <Info size={14} className="text-white/70 group-hover:text-white shrink-0" />
                  </div>
                </div>
              </div>
              <div className="px-4 py-2 bg-[var(--bg-elevated)] border-t border-[var(--border-subtle)] flex items-center justify-between gap-4 text-xs font-medium text-[var(--text-tertiary)] shrink-0">
                <div className="flex items-center gap-2">
                  <span>{t('swipeRightApprove')}</span>
                  <span>•</span>
                  <span>{t('swipeLeftDecline')}</span>
                </div>
                {onOpenDetails && (
                  <button
                    type="button"
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
            </>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col justify-between p-6 text-center bg-gradient-to-b from-[var(--bg-elevated)] to-[var(--bg-inset)]">
              <div className="flex items-center justify-center pointer-events-none">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent-bg)]/12 text-[var(--accent-bg)] text-xs font-bold truncate max-w-[85%]">
                  <Layers size={12} />
                  <span className="truncate">{topic || 'Custom Poll'}</span>
                </span>
              </div>
              <div
                onClick={(e) => {
                  if (Math.hypot(dragOffset.x, dragOffset.y) > 8) return;
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
                  <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight leading-tight max-w-xs break-words group-hover:underline">{activeCard?.name}</h2>
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
          <>
            <div
              onPointerDown={handlePhotoSurfacePointerDown}
              onPointerUp={handlePhotoSurfacePointerUp}
              className="relative flex-1 min-h-0 w-full bg-[var(--bg-inset)] overflow-hidden touch-none select-none"
            >
              <img
                key={displayPhoto}
                src={displayPhoto}
                alt={activeCard?.name || 'Venue'}
                className="w-full h-full object-cover animate-[fadeIn_0.22s_ease-out] pointer-events-none select-none"
                draggable="false"
                onError={(e) => {
                  const fallbackNext = validSlides[(safePhotoIdx + 1) % validSlides.length]?.url || fallbackPhoto;
                  setFailedUrls((prev) => ({ ...prev, [displayPhoto]: true }));
                  if (fallbackNext && e.currentTarget.src !== fallbackNext) e.currentTarget.src = fallbackNext;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/15 pointer-events-none" />

              {validSlides.length > 1 && (
                <div className="absolute top-2.5 inset-x-4 flex items-center gap-1.5 z-20">
                  {validSlides.slice(0, 4).map((slide, idx) => (
                    <button
                      key={slide.url || idx}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); triggerHaptic('tap'); setPhotoIdx(idx); }}
                      aria-label={`View photo ${idx + 1}: ${slide.label}`}
                      className={`h-1.5 flex-1 rounded-full transition-all cursor-pointer ${
                        idx === safePhotoIdx
                          ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]'
                          : idx < safePhotoIdx
                          ? 'bg-white/65 hover:bg-white/85'
                          : 'bg-white/30 hover:bg-white/55'
                      }`}
                    />
                  ))}
                </div>
              )}

              {validSlides.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); triggerHaptic('tap'); setPhotoIdx((prev) => (prev > 0 ? prev - 1 : validSlides.length - 1)); }}
                    aria-label="Previous photo"
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/85 backdrop-blur-md text-white border border-white/20 flex items-center justify-center transition-all cursor-pointer z-20 active:scale-95 shadow-md"
                  >
                    <ChevronLeft size={16} strokeWidth={2.5} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); triggerHaptic('tap'); setPhotoIdx((prev) => (prev + 1) % validSlides.length); }}
                    aria-label="Next photo"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/85 backdrop-blur-md text-white border border-white/20 flex items-center justify-center transition-all cursor-pointer z-20 active:scale-95 shadow-md"
                  >
                    <ChevronRight size={16} strokeWidth={2.5} />
                  </button>
                </>
              )}

              <div className={`absolute ${validSlides.length > 1 ? 'top-6' : 'top-4'} inset-x-4 flex items-center justify-between z-10 pointer-events-none`}>
                <span className="px-3 py-1 rounded-full bg-black/65 backdrop-blur-md text-xs font-semibold text-white border border-white/10 truncate max-w-[60%]">
                  {activeCard?.category || vibeSubtitle || t('localVenue')}
                </span>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/65 backdrop-blur-md text-xs font-bold text-amber-300 border border-white/10 tabular-nums">
                  <Star size={13} className="fill-amber-300 text-amber-300" />
                  <span>{cardRating}</span>
                  <span className="text-[11px] text-white/75 font-normal">({cardReviewCount})</span>
                </div>
              </div>

              {validSlides.length > 1 && (
                <div
                  onClick={(e) => {
                    if (Math.hypot(dragOffset.x, dragOffset.y) > 8) return;
                    e.stopPropagation();
                    triggerHaptic('tap');
                    setPhotoIdx((prev) => (prev + 1) % validSlides.length);
                  }}
                  className="absolute bottom-16 inset-x-4 z-20 flex items-center cursor-pointer"
                >
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 hover:bg-black/85 backdrop-blur-md text-[11px] font-semibold text-white border border-white/15 shadow-sm transition-colors">
                    <Camera size={11} className="text-emerald-400 shrink-0" />
                    <span className="font-bold text-emerald-300 tabular-nums shrink-0">{safePhotoIdx + 1} / {validSlides.length}</span>
                  </span>
                </div>
              )}

              <div
                onClick={(e) => {
                  if (Math.hypot(dragOffset.x, dragOffset.y) > 8) return;
                  e.stopPropagation();
                  triggerHaptic('tap');
                  onOpenDetails?.(safePhotoIdx);
                }}
                className="absolute bottom-3.5 inset-x-4 text-left flex flex-col gap-1 z-20 cursor-pointer group"
                title="Tap for venue details, map & 4-photo gallery"
              >
                <div className="flex items-center gap-1.5">
                  <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight line-clamp-1 group-hover:underline">{activeCard?.name}</h2>
                  <Info size={15} className="text-white/70 group-hover:text-white shrink-0" />
                </div>
                <div className="flex items-center gap-1.5 text-xs text-zinc-200 font-medium">
                  <MapPin size={13} className="text-amber-400 shrink-0" />
                  <span className="truncate">{activeCard?.address || 'Local Spot'}</span>
                </div>
              </div>
            </div>

            <div className="px-3.5 sm:px-4 py-2 bg-[var(--bg-elevated)] border-t border-[var(--border-subtle)] flex items-center justify-between gap-3 text-left shrink-0">
              <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)] min-w-0 truncate">
                <span className="font-semibold text-[var(--text-primary)] tabular-nums">{cardPriceDesc}</span>
                <span className="text-[var(--text-tertiary)]">•</span>
                <span className="flex items-center gap-1 truncate tabular-nums text-[var(--text-secondary)]">
                  <Route size={13} className="text-[var(--accent-bg)] shrink-0" />
                  <span className="truncate">{cardWalkDesc}</span>
                </span>
              </div>
              {onOpenDetails && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic('tap');
                    onOpenDetails(safePhotoIdx);
                  }}
                  aria-label="View details and 4-photo gallery"
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--bg-surface)] hover:bg-[var(--bg-inset)] border border-[var(--border-main)] text-[var(--text-primary)] text-xs font-semibold transition-all cursor-pointer active:scale-95 shadow-2xs"
                >
                  <Camera size={13} className="text-[var(--accent-bg)]" />
                  <span>{t('details')}</span>
                  <span className="text-[11px] text-[var(--text-tertiary)] tabular-nums">({validSlides.length})</span>
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
