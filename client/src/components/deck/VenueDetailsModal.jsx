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
} from 'lucide-react';
import { getVenueRating, getVenueVibe, useVenuePhotos } from '../../utils/venueImages';
import CleanStreetMiniMap from './CleanStreetMiniMap';

export default function VenueDetailsModal({ venue, isOpen, onClose, inline = false }) {
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  const { photos, isRealPhoto, fallbackPhoto } = useVenuePhotos(
    venue?.name,
    venue?.address,
    venue?.category,
    venue?.photo_url
  );

  useEffect(() => {
    setActivePhotoIdx(0);
  }, [venue?.name]);

  if (!venue || (!isOpen && !inline)) return null;

  const { rating, reviewCount } = getVenueRating(venue.name, venue.category);
  const vibe = getVenueVibe(venue.name, venue.category);
  const priceLevel = venue.price_level || 2;
  const priceDesc =
    priceLevel === 1
      ? '$ • Budget (~80-150 MDL / person)'
      : priceLevel === 2
      ? '$$ • Moderate (~150-300 MDL / person)'
      : priceLevel === 3
      ? '$$$ • Upscale (~300-500 MDL / person)'
      : '$$$$ • Fine Dining (500+ MDL / person)';

  const distKm = venue.distance_km;
  const walkMin = venue.walk_minutes || (distKm != null ? Math.max(2, Math.round(distKm * 12.5)) : null);
  const driveMin = venue.drive_minutes || (distKm != null ? Math.max(2, Math.round(distKm * 2.2)) : null);

  const hasCoords = venue.lat != null && venue.lng != null && !isNaN(Number(venue.lat)) && !isNaN(Number(venue.lng));
  const latNum = hasCoords ? Number(venue.lat) : null;
  const lngNum = hasCoords ? Number(venue.lng) : null;

  const destinationQuery = encodeURIComponent(`${venue.name} ${venue.address || ''}`);
  const driveRouteUrl = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${latNum},${lngNum}&travelmode=driving`
    : `https://www.google.com/maps/dir/?api=1&destination=${destinationQuery}&travelmode=driving`;
  const walkRouteUrl = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${latNum},${lngNum}&travelmode=walking`
    : `https://www.google.com/maps/dir/?api=1&destination=${destinationQuery}&travelmode=walking`;
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30 pointer-events-none" />

        {/* Top Bar Badges */}
        <div className="absolute top-3.5 inset-x-3.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-md border border-white/15 text-white text-xs font-bold">
            <Star size={12} className="text-amber-400 fill-amber-400" />
            <span>{rating}</span>
            <span className="text-white/75 font-normal">({reviewCount})</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-md border border-white/15 text-white text-[11px] font-semibold flex items-center gap-1">
              <Camera size={11} className="text-emerald-400" />
              <span>{isRealPhoto ? `${photos.length} Venue Photos` : 'Venue Preview'}</span>
            </span>
            {!inline && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-black/65 backdrop-blur-md border border-white/15 text-white flex items-center justify-center hover:bg-black/85 transition-colors cursor-pointer"
                aria-label="Close Details"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Bottom Title & Vibe on Photo */}
        <div className="absolute bottom-3 inset-x-4 flex items-end justify-between gap-2">
          <div className="min-w-0">
            <span className="inline-block px-2 py-0.5 rounded-md bg-[var(--accent-bg)] text-white text-[11px] font-bold mb-1">
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
          <span className="text-[11px] text-[var(--text-tertiary)] ml-auto shrink-0">
            Tap to view photos
          </span>
        </div>
      )}

      {/* Scrollable Details Body */}
      <div className="p-4 sm:p-5 overflow-y-auto flex flex-col gap-3.5">
        {/* True Street/Road Network Travel Time Cards */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2.5 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)] flex flex-col gap-0.5">
            <span className="text-[11px] text-[var(--text-tertiary)] font-medium flex items-center gap-1">
              <Navigation size={11} className="text-[var(--accent-bg)]" />
              <span>Road Route</span>
            </span>
            <span className="text-sm font-black text-[var(--text-primary)]">
              {distKm != null ? `${distKm} km` : 'Local'}
            </span>
            <span className="text-[11px] text-[var(--text-secondary)]">Via real streets</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)] flex flex-col gap-0.5">
            <span className="text-[11px] text-[var(--text-tertiary)] font-medium flex items-center gap-1">
              <Car size={12} className="text-emerald-500" />
              <span>By Car / Taxi</span>
            </span>
            <span className="text-sm font-black text-[var(--text-primary)]">
              {driveMin != null ? `~${driveMin} min` : 'Quick ride'}
            </span>
            <span className="text-[11px] text-[var(--text-secondary)]">Street traffic</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)] flex flex-col gap-0.5">
            <span className="text-[11px] text-[var(--text-tertiary)] font-medium flex items-center gap-1">
              <Footprints size={12} className="text-amber-500" />
              <span>Walking</span>
            </span>
            <span className="text-sm font-black text-[var(--text-primary)]">
              {walkMin != null ? `~${walkMin} min` : 'Walkable'}
            </span>
            <span className="text-[11px] text-[var(--text-secondary)]">Pedestrian path</span>
          </div>
        </div>

        {/* Address & Price Info Box */}
        <div className="p-3.5 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)] flex flex-col gap-2">
          <div className="flex items-start gap-2.5">
            <MapPin size={15} className="text-[var(--accent-bg)] shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="text-xs font-bold text-[var(--text-primary)]">
                {venue.address || 'Central Area'}
              </div>
              <div className="text-[11px] text-[var(--text-tertiary)]">
                Routed via street network & bridges (not straight-line)
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
            <span className="text-[var(--text-secondary)] font-medium">Estimated Spend</span>
            <span className="font-bold text-[var(--text-primary)]">{priceDesc}</span>
          </div>
        </div>

        {/* Decluttered Interactive Street Mini-Map */}
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
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[var(--accent-bg)] text-white text-xs font-bold shadow-xs hover:opacity-95 transition-opacity"
          >
            <Navigation size={13} />
            <span>Road Directions</span>
          </a>
          <a
            href={reviewsSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[var(--bg-inset)] border border-[var(--border-main)] text-[var(--text-primary)] text-xs font-bold hover:border-[var(--accent-bg)] transition-colors"
          >
            <BookOpen size={13} className="text-[var(--accent-bg)]" />
            <span>Menu & Reviews</span>
            <ExternalLink size={11} className="text-[var(--text-tertiary)]" />
          </a>
        </div>
      </div>
    </div>
  );

  if (inline) {
    return <div className="flex-1 flex flex-col justify-center px-4 py-2 max-w-md mx-auto w-full">{content}</div>;
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-4 animate-[fadeIn_0.15s_ease-out]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md animate-[modalSpring_0.25s_var(--spring-smooth)]"
        onClick={(e) => e.stopPropagation()}
      >
        {content}
      </div>
    </div>
  );
}
