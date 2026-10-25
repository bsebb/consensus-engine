import React, { useState, useEffect } from 'react';
import {
  ThumbsUp,
  ThumbsDown,
  Flame,
  Star,
  MapPin,
  Route,
  Info,
  Layers,
  ChevronLeft,
  ChevronRight,
  Camera,
} from 'lucide-react';
import { getVenueVibe, useVenuePhotos } from '../../utils/venueImages';
import { useCustomOptionPhoto, isLogoImage } from '../../utils/customOptionService';
import { useLanguage } from '../../context/LanguageContext';
import { triggerHaptic } from '../../utils/haptics';

export default function SwipeCard({
  mode,
  topic,
  cardIndex = 1,
  totalCards = 1,
  activeCard,
  dragOffset,
  exitDirection,
  enterDirection,
  isDragging,
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  handlePointerCancel,
  cardRating,
  cardReviewCount,
  cardPriceDesc,
  cardWalkDesc,
  onOpenDetails,
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

  const { primaryPhoto, photos, photoSlides, fallbackPhoto } = useVenuePhotos(
    useRealVenueGallery ? activeCard?.name : '',
    useRealVenueGallery ? activeCard?.address : '',
    useRealVenueGallery ? activeCard?.category : '',
    useRealVenueGallery ? activeCard?.photo_url : null
  );
  const [photoIdx, setPhotoIdx] = useState(0);
  const [failedUrls, setFailedUrls] = useState({});
  const [customImgError, setCustomImgError] = useState(false);
  const [showGestureHint, setShowGestureHint] = useState(() => {
    try {
      return !localStorage.getItem('consensus_seen_swipe_hint');
    } catch {
      return true;
    }
  });

  const dismissGestureHint = () => {
    setShowGestureHint(false);
    try {
      localStorage.setItem('consensus_seen_swipe_hint', 'true');
    } catch {}
  };

  useEffect(() => {
    setPhotoIdx(0);
    setFailedUrls({});
    setCustomImgError(false);
    if (cardIndex > 1 && showGestureHint) {
      dismissGestureHint();
    }
  }, [activeCard?.id, activeCard?.name, cardIndex]);

  const validPhotos = (photos || []).filter((u) => !failedUrls[u]);
  const displayPhoto = (!useRealVenueGallery && customPhoto)
    ? customPhoto
    : (validPhotos[photoIdx] || validPhotos[0] || primaryPhoto || fallbackPhoto);
  const vibeSubtitle = getVenueVibe(activeCard?.name, activeCard?.category);

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
    <main className="px-4 py-1.5 flex flex-col justify-center flex-1 min-h-0 max-w-md mx-auto w-full select-none">
      <div
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
        className={`w-full flex-1 max-h-none sm:max-h-[640px] min-h-0 rounded-3xl bg-[var(--bg-elevated)] shadow-[0_20px_50px_rgba(0,0,0,0.14)] border border-[var(--border-main)] relative my-auto cursor-grab active:cursor-grabbing flex flex-col overflow-hidden ${enterClass}`}
      >
        {/* Dynamic On-Drag Optical Stamps */}
        {likeProgress > 0 && (
          <div
            style={{
              opacity: Math.min(1, likeProgress * 1.25),
              transform: `scale(${0.76 + likeProgress * 0.34}) rotate(-12deg)`,
            }}
            className="absolute top-6 right-6 px-4 py-1.5 rounded-2xl border-2 border-emerald-500 bg-emerald-950/85 text-emerald-400 font-bold text-sm tracking-wide backdrop-blur-md flex items-center gap-1.5 z-30 pointer-events-none select-none shadow-[0_6px_24px_rgba(16,185,129,0.35)] origin-top-right transition-none"
          >
            <ThumbsUp size={16} strokeWidth={2.5} />
            <span>{t('likeAction')}</span>
          </div>
        )}
        {passProgress > 0 && (
          <div
            style={{
              opacity: Math.min(1, passProgress * 1.25),
              transform: `scale(${0.76 + passProgress * 0.34}) rotate(12deg)`,
            }}
            className="absolute top-6 left-6 px-4 py-1.5 rounded-2xl border-2 border-rose-500 bg-rose-950/85 text-rose-400 font-bold text-sm tracking-wide backdrop-blur-md flex items-center gap-1.5 z-30 pointer-events-none select-none shadow-[0_6px_24px_rgba(244,63,94,0.35)] origin-top-left transition-none"
          >
            <ThumbsDown size={16} strokeWidth={2.5} />
            <span>{t('passAction')}</span>
          </div>
        )}
        {vetoProgress > 0 && (
          <div
            style={{
              opacity: vetoProgress,
              transform: `scale(${0.88 + vetoProgress * 0.2})`,
            }}
            className="absolute inset-x-12 top-7 py-2 rounded-2xl border-2 border-red-600 bg-red-950/90 text-red-400 font-bold text-sm tracking-wide backdrop-blur-md flex items-center justify-center gap-2 z-30 pointer-events-none select-none shadow-[0_6px_24px_rgba(220,38,38,0.35)] origin-top transition-none"
          >
            <Flame size={16} strokeWidth={2.5} />
            <span>{t('vetoAction')}</span>
          </div>
        )}
        {superlikeProgress > 0 && (
          <div
            style={{
              opacity: superlikeProgress,
              transform: `scale(${0.88 + superlikeProgress * 0.2})`,
            }}
            className="absolute inset-x-12 bottom-7 py-2 rounded-2xl border-2 border-amber-400 bg-amber-950/85 text-amber-300 font-bold text-sm tracking-wide backdrop-blur-md flex items-center justify-center gap-2 z-30 pointer-events-none select-none shadow-[0_6px_24px_rgba(251,191,36,0.35)] origin-bottom transition-none"
          >
            <Star size={16} strokeWidth={2.5} className="fill-amber-300" />
            <span>{t('superlikeAction') || 'SUPERLIKE'}</span>
          </div>
        )}

        {/* First-Card Onboarding Gesture Pill */}
        {cardIndex === 1 && showGestureHint && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            onClick={dismissGestureHint}
            className="absolute bottom-20 sm:bottom-24 inset-x-4 z-40 py-2 px-3 rounded-full bg-black/85 backdrop-blur-xl border border-white/20 text-white shadow-2xl flex items-center justify-between gap-2 animate-bounce-subtle cursor-pointer select-none"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles size={14} className="text-amber-400 shrink-0" />
              <span className="text-[11px] font-bold tracking-tight truncate">
                {t('swipeHintPill') || '👉 Swipe right to Like • Left to Pass • Tap for details'}
              </span>
            </div>
            <span className="w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center text-xs font-bold shrink-0 transition-colors">
              ✕
            </span>
          </div>
        )}

        {/* Card Content Surface (Direct 2D Layout) */}
        {isCustomCard && !isRoutable ? (
          customPhoto && !customImgError ? (
            <>
              <div className={`relative flex-1 min-h-0 w-full overflow-hidden ${isLogoImage(customPhoto) ? 'bg-zinc-900' : 'bg-[var(--bg-inset)]'}`}>
                <img
                  src={customPhoto}
                  alt={activeCard?.name}
                  className={isLogoImage(customPhoto) ? 'w-full h-full object-contain p-10 pb-24' : 'w-full h-full object-cover'}
                  draggable="false"
                  onError={() => setCustomImgError(true)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10" />

                <div className="absolute top-4 inset-x-4 flex items-center justify-between z-10">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-xs font-semibold text-white border border-white/10 max-w-[85%] truncate">
                    <Layers size={12} className="text-amber-400 shrink-0" />
                    <span className="truncate">{topic || 'Custom Poll'}</span>
                  </span>
                </div>

                <div
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => {
                    triggerHaptic('tap');
                    onOpenDetails?.();
                  }}
                  className="absolute bottom-3.5 inset-x-4 text-left flex flex-col gap-1 z-10 cursor-pointer group"
                  title="Tap for option details"
                >
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight line-clamp-2 group-hover:underline">
                      {activeCard?.name}
                    </h2>
                    <Info size={14} className="text-white/70 group-hover:text-white shrink-0" />
                  </div>
                </div>
              </div>

              <div className="px-4 py-2.5 bg-[var(--bg-elevated)] border-t border-[var(--border-subtle)] flex items-center justify-between gap-4 text-xs font-medium text-[var(--text-tertiary)] shrink-0">
                <div className="flex items-center gap-2">
                  <span>{t('swipeRightApprove')}</span>
                  <span>•</span>
                  <span>{t('swipeLeftDecline')}</span>
                </div>
                {onOpenDetails && (
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic('tap');
                      onOpenDetails();
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
              <div className="flex items-center justify-center">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent-bg)]/12 text-[var(--accent-bg)] text-xs font-bold truncate max-w-[85%]">
                  <Layers size={12} />
                  <span className="truncate">{topic || 'Custom Poll'}</span>
                </span>
              </div>

              <div
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => {
                  triggerHaptic('tap');
                  onOpenDetails?.();
                }}
                className="my-auto py-8 px-2 flex flex-col items-center gap-3 cursor-pointer group"
                title="Tap for option details"
              >
                <div className="w-14 h-14 rounded-2xl bg-[var(--accent-bg)]/12 border border-[var(--accent-bg)]/25 text-[var(--accent-bg)] flex items-center justify-center text-xl font-bold tabular-nums shadow-xs group-hover:scale-105 transition-transform">
                  #{cardIndex}
                </div>
                <div className="flex items-center gap-1.5 justify-center">
                  <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight leading-tight max-w-xs break-words group-hover:underline">
                    {activeCard?.name}
                  </h2>
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
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic('tap');
                      onOpenDetails();
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
            <div className="relative flex-1 min-h-0 w-full bg-[var(--bg-inset)] overflow-hidden">
              <img
                src={displayPhoto}
                alt={activeCard?.name || 'Venue'}
                className="w-full h-full object-cover"
                draggable="false"
                onError={(e) => {
                  if (e.currentTarget.src !== fallbackPhoto) {
                    setFailedUrls((prev) => ({ ...prev, [displayPhoto]: true }));
                    e.currentTarget.src = fallbackPhoto;
                  }
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />

              {validPhotos.length > 1 && (
                <div className="absolute top-2.5 inset-x-4 flex items-center gap-1.5 z-20">
                  {validPhotos.slice(0, 4).map((url, idx) => (
                    <button
                      key={url}
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPhotoIdx(idx);
                      }}
                      aria-label={`View photo ${idx + 1}`}
                      className={`h-1 flex-1 rounded-full transition-all cursor-pointer ${
                        idx === photoIdx ? 'bg-white shadow-xs' : 'bg-white/35 hover:bg-white/60'
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Floating photo navigation chevrons for smooth browsing */}
              {validPhotos.length > 1 && (
                <>
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic('tap');
                      setPhotoIdx((prev) => (prev > 0 ? prev - 1 : validPhotos.length - 1));
                    }}
                    aria-label="Previous photo"
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/85 backdrop-blur-md text-white border border-white/20 flex items-center justify-center transition-all cursor-pointer z-20 active:scale-95 shadow-md"
                  >
                    <ChevronLeft size={16} strokeWidth={2.5} />
                  </button>
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic('tap');
                      setPhotoIdx((prev) => (prev < validPhotos.length - 1 ? prev + 1 : 0));
                    }}
                    aria-label="Next photo"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/85 backdrop-blur-md text-white border border-white/20 flex items-center justify-center transition-all cursor-pointer z-20 active:scale-95 shadow-md"
                  >
                    <ChevronRight size={16} strokeWidth={2.5} />
                  </button>
                </>
              )}

              <div className={`absolute ${validPhotos.length > 1 ? 'top-6' : 'top-4'} inset-x-4 flex items-center justify-between z-10`}>
                <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-xs font-semibold text-white border border-white/10 truncate max-w-[60%]">
                  {vibeSubtitle || activeCard?.category || 'Local Venue'}
                </span>

                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-xs font-bold text-amber-300 border border-white/10 tabular-nums">
                  <Star size={13} className="fill-amber-300 text-amber-300" />
                  <span>{cardRating}</span>
                  <span className="text-[11px] text-white/75 font-normal">({cardReviewCount})</span>
                </div>
              </div>

              {/* Photo slide detail pill badge */}
              {photoSlides && photoSlides[photoIdx] && (
                <div className="absolute bottom-16 inset-x-4 z-10 pointer-events-none">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-[11px] font-semibold text-white/90 border border-white/15 shadow-sm max-w-[95%] truncate">
                    <Camera size={11} className="text-emerald-400 shrink-0" />
                    <span className="font-bold text-white">{photoSlides[photoIdx].label}:</span>
                    <span className="truncate">{photoSlides[photoIdx].detail}</span>
                  </span>
                </div>
              )}

              <div
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => {
                  triggerHaptic('tap');
                  onOpenDetails?.();
                }}
                className="absolute bottom-3.5 inset-x-4 text-left flex flex-col gap-1 z-10 cursor-pointer group"
                title="Tap for venue details, map & photos"
              >
                <div className="flex items-center gap-1.5">
                  <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight line-clamp-1 group-hover:underline">
                    {activeCard?.name}
                  </h2>
                  <Info size={15} className="text-white/70 group-hover:text-white shrink-0" />
                </div>
                <div className="flex items-center gap-1.5 text-xs text-zinc-200 font-medium">
                  <MapPin size={13} className="text-amber-400 shrink-0" />
                  <span className="truncate">{activeCard?.address || 'Local Spot'}</span>
                </div>
              </div>
            </div>

            <div className="px-4 py-2.5 bg-[var(--bg-elevated)] border-t border-[var(--border-subtle)] flex items-center justify-between gap-3 text-left shrink-0">
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
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic('tap');
                    onOpenDetails();
                  }}
                  aria-label="View details and map"
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--bg-surface)] hover:bg-[var(--bg-inset)] border border-[var(--border-main)] text-[var(--text-primary)] text-xs font-semibold transition-all cursor-pointer active:scale-95 shadow-2xs"
                >
                  <Info size={13} className="text-[var(--accent-bg)]" />
                  <span>{t('details')}</span>
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
