import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { getVenueRating, getVenueVibe, useVenuePhotos } from '../../utils/venueImages';
import { useLanguage } from '../../context/LanguageContext';
import CleanStreetMiniMap from './CleanStreetMiniMap';

export default function VenueDetailsModal({ venue, isOpen, onClose, inline = false }) {
  const { lang, t } = useLanguage();
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  const { photos, isRealPhoto, fallbackPhoto } = useVenuePhotos(
    venue?.name,
    venue?.address,
    venue?.category,
    venue?.photo_url
  );

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

  useEffect(() => {
    setActivePhotoIdx(0);
    setReported(false);
  }, [venue?.name]);

  const handleReportClosed = async () => {
    if (!venue?.name || isReporting) return;
    setIsReporting(true);
    try {
      await fetch('/api/v1/venues/report-closed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: venue.name,
          address: venue.address,
          lat: venue.lat,
          lng: venue.lng,
          reason: 'permanently_closed',
        }),
      });
      setReported(true);
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
  const priceDesc =
    priceLevel === 1
      ? t('budgetLevel1')
      : priceLevel === 2
      ? t('budgetLevel2')
      : priceLevel === 3
      ? t('budgetLevel3')
      : t('budgetLevel4');

  const distKm = venue.distance_km;
  const walkMin = venue.walk_minutes || (distKm != null ? Math.max(2, Math.round(distKm * 12.5)) : null);
  const driveMin = venue.drive_minutes || (distKm != null ? Math.max(2, Math.round(distKm * 2.2)) : null);
  const isWalkable = distKm != null && distKm <= 1.5;

  const hasCoords = venue.lat != null && venue.lng != null && !isNaN(Number(venue.lat)) && !isNaN(Number(venue.lng));
  const latNum = hasCoords ? Number(venue.lat) : null;
  const lngNum = hasCoords ? Number(venue.lng) : null;

  const destinationQuery = encodeURIComponent(`${venue.name} ${venue.address || ''}`);
  const driveRouteUrl = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${latNum},${lngNum}&travelmode=driving`
    : `https://www.google.com/maps/dir/?api=1&destination=${destinationQuery}&travelmode=driving`;
  const reviewsSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(`${venue.name} ${venue.address || ''} menu reviews photos`)}`;

  const activePhotoUrl = photos[activePhotoIdx] || photos[0] || fallbackPhoto;

  const content = (
    <div className="w-full rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-main)] shadow-[0_20px_50px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col max-h-[84dvh]">
      {/* Top Hero Photo + Gallery Strip */}
      <div className="relative h-52 sm:h-60 w-full bg-[var(--bg-inset)] shrink-0 overflow-hidden">
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

        {/* Top Bar Badges */}
        <div className="absolute top-3.5 inset-x-3.5 flex items-center justify-between gap-2 z-10">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-md border border-white/15 text-white text-xs font-bold tabular-nums">
            <Star size={12} className="text-amber-400 fill-amber-400" />
            <span>{rating}</span>
            <span className="text-white/75 font-normal">({reviewCount})</span>
          </div>

          <div className="flex items-center gap-1.5">
            {photos.length > 1 ? (
              <span className="px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-md border border-white/15 text-white text-[11px] font-bold flex items-center gap-1.5 tabular-nums">
                <Camera size={11} className="text-emerald-400" />
                <span>{activePhotoIdx + 1} / {photos.length}</span>
              </span>
            ) : !isRealPhoto ? (
              <span className="px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-md border border-white/15 text-white text-[11px] font-semibold">
                {t('venuePreview')}
              </span>
            ) : null}

            {!inline && onClose && (
              <button
                type="button"
                onClick={handleClose}
                className="w-8 h-8 rounded-full bg-black/65 backdrop-blur-md border border-white/15 text-white flex items-center justify-center hover:bg-black/85 transition-colors cursor-pointer"
                aria-label="Close Details"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Bottom Title & Vibe on Photo */}
        <div className="absolute bottom-3 inset-x-4 flex items-end justify-between gap-2 z-10">
          <div className="min-w-0">
            <span className="inline-block px-2.5 py-0.5 rounded-full bg-[var(--accent-bg)] text-white text-[11px] font-bold mb-1 shadow-xs">
              {vibe}
            </span>
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
      <div className="p-4 sm:p-5 overflow-y-auto flex flex-col gap-3.5">
        {/* Context-Aware Human-Centric Travel & Spend Capsule */}
        <div className="p-3.5 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)] flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[var(--accent-bg)]/12 text-[var(--accent-bg)] flex items-center justify-center shrink-0">
                {isWalkable ? (
                  <Footprints size={17} />
                ) : (
                  <Car size={17} />
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-black text-[var(--text-primary)] leading-tight truncate tabular-nums">
                  {distKm != null
                    ? isWalkable
                      ? `~${walkMin} min • ${distKm} km`
                      : `~${driveMin} min • ${distKm} km`
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

            <div className="text-right shrink-0">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] block">
                {t('estimatedSpend')}
              </span>
              <span className="text-xs font-bold text-[var(--text-primary)]">
                {priceDesc}
              </span>
            </div>
          </div>

          {/* Clean Address Line (without debug monologue) */}
          {venue.address && (
            <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <MapPin size={13} className="text-[var(--accent-bg)] shrink-0" />
              <span className="truncate font-medium">{venue.address}</span>
            </div>
          )}
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

        {/* 1-Tap Route & Menu Actions */}
        <div className="grid grid-cols-2 gap-2 pt-0.5">
          <a
            href={driveRouteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl bg-[var(--accent-bg)] hover:bg-[var(--accent-bg-hover)] text-white text-xs font-bold shadow-xs transition-all active:scale-[0.97]"
          >
            <Navigation size={14} />
            <span>{t('roadDirections')}</span>
          </a>
          <a
            href={reviewsSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl bg-[var(--bg-inset)] border border-[var(--border-main)] text-[var(--text-primary)] text-xs font-bold hover:border-[var(--accent-bg)] transition-all active:scale-[0.97]"
          >
            <BookOpen size={14} className="text-[var(--accent-bg)]" />
            <span>{t('menuAndReviews')}</span>
            <ExternalLink size={11} className="text-[var(--text-tertiary)]" />
          </a>
        </div>

        {/* Outdated / Closed Venue Flag */}
        <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px]">
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
              className="inline-flex items-center gap-1 text-[var(--text-secondary)] hover:text-rose-400 transition-colors font-medium cursor-pointer active:scale-[0.96]"
            >
              <AlertTriangle size={12} className="text-amber-500/80" />
              <span>{isReporting ? t('reporting') : t('reportClosed')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (!isOpen && !isClosing && !inline) return null;

  if (inline) {
    return <div className="flex-1 flex flex-col justify-center px-4 py-2 max-w-md mx-auto w-full">{content}</div>;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={`fixed inset-0 z-50 modal-backdrop-ios flex items-end sm:items-center justify-center p-3 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-[max(1rem,env(safe-area-inset-top,0px))] sm:p-4 ${
        isClosing ? 'animate-fade-out' : 'animate-fade-in'
      }`}
      onClick={handleClose}
    >
      <div
        className={`w-full max-w-md ${
          isClosing ? 'animate-sheet-down sm:animate-scale-down' : 'animate-sheet-up sm:animate-modal-spring'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {content}
      </div>
    </div>
  );
}
