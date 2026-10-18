import React from 'react';
import { MapPin, Navigation, Minus, Plus, ArrowRight } from 'lucide-react';
import RangeSlider from '../ui/RangeSlider';

export default function HostConstraints({
  mode,
  radiusKm,
  setRadiusKm,
  radiusPresets,
  priceTier,
  setPriceTier,
  priceTiers,
  userLocation,
  detectLocation,
  suggestionLimit,
  setSuggestionLimit,
  advanceToStage,
}) {
  return (
    <div className="accordion-drawer-inner p-3.5 pt-0 border-t border-[var(--border-subtle)]/50 mt-1 flex flex-col gap-3.5">
      {mode === 'DISCOVERY' ? (
        <>
          {/* Radius Slider with Quick Presets */}
          <div className="flex flex-col gap-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[var(--text-secondary)]">Search Radius</span>
              <span className="font-mono text-xs font-extrabold text-[var(--accent-bg)]">
                {radiusKm.toFixed(1)} km
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {radiusPresets.map((preset) => {
                const isPresetActive = radiusKm === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRadiusKm(preset)}
                    className={`flex-1 py-1 px-1.5 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                      isPresetActive
                        ? 'bg-[var(--accent-bg)] text-white border-[var(--accent-bg)] shadow-sm'
                        : 'bg-[var(--bg-inset)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--text-tertiary)]'
                    }`}
                  >
                    {preset} km
                  </button>
                );
              })}
            </div>

            <RangeSlider
              min={1}
              max={15}
              step={0.5}
              value={radiusKm}
              onChange={setRadiusKm}
              label="Maximum Distance"
              valueDisplay={`${radiusKm.toFixed(1)} km`}
            />
          </div>

          {/* Price Tier Segmented Pills */}
          <div className="flex flex-col gap-1.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[var(--text-secondary)]">Target Price Bracket</span>
              <span className="font-mono text-xs font-extrabold text-[var(--accent-bg)]">
                {priceTiers.find((p) => p.value === priceTier)?.desc}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {priceTiers.map((tier) => {
                const isActive = priceTier === tier.value;
                return (
                  <button
                    key={tier.value}
                    type="button"
                    onClick={() => setPriceTier(tier.value)}
                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border transition-all cursor-pointer active:scale-95 ${
                      isActive
                        ? 'bg-[var(--accent-bg)] text-white border-[var(--accent-bg)] shadow-sm'
                        : 'bg-[var(--bg-inset)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--text-tertiary)]'
                    }`}
                  >
                    <span className="font-mono text-xs font-black">{tier.label}</span>
                    <span className="text-[10px] opacity-80 mt-0.5">{tier.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Location & Hexagonal Grid Indicator */}
          <div className="flex flex-col gap-2 p-3 rounded-xl bg-[var(--bg-inset)] border border-[var(--border-subtle)] mt-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <MapPin size={14} className="text-[var(--accent-bg)]" />
                <span className="text-[11px] font-bold text-[var(--text-primary)]">Search Origin</span>
              </div>
              <button
                type="button"
                onClick={detectLocation}
                disabled={userLocation.status === 'detecting'}
                className="flex items-center gap-1 py-1 px-2 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--accent-bg)]/10 text-[var(--accent-bg)] border border-[var(--border-subtle)] text-[10px] font-bold cursor-pointer transition-colors"
              >
                <Navigation size={10} className={userLocation.status === 'detecting' ? 'animate-spin' : ''} />
                <span>{userLocation.status === 'detecting' ? 'Locating...' : 'Use Current GPS'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[var(--text-secondary)] font-mono truncate max-w-[210px] flex items-center gap-1">
                {userLocation.status === 'granted' ? (
                  <>
                    <MapPin size={11} className="text-[var(--accent-bg)] shrink-0" />
                    <span>Lat {userLocation.latitude.toFixed(4)}, Lng {userLocation.longitude.toFixed(4)}</span>
                  </>
                ) : (
                  userLocation.label
                )}
              </span>
              <span className="font-bold text-[var(--accent-bg)] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Adaptive Grid
              </span>
            </div>

            <p className="text-[10px] text-[var(--text-tertiary)] leading-tight">
              Hexagonal search begins in your 1 km neighborhood and auto-expands outward until enough quality venues are found.
            </p>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-between bg-[var(--bg-inset)] p-3 rounded-xl border border-[var(--border-subtle)] pt-1">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-[var(--text-primary)]">Suggestions per Voter</span>
            <span className="text-[10px] text-[var(--text-secondary)]">Candidate pool capacity</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSuggestionLimit((prev) => Math.max(1, prev - 1))}
              aria-label="Decrease suggestion limit"
              className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-main)] flex items-center justify-center text-[var(--text-primary)] hover:border-[var(--accent-bg)] transition-transform active:scale-95 cursor-pointer"
            >
              <Minus size={14} />
            </button>
            <span className="font-mono text-xs font-bold text-[var(--text-primary)] w-6 text-center tabular-nums">
              {suggestionLimit}
            </span>
            <button
              type="button"
              onClick={() => setSuggestionLimit((prev) => Math.min(6, prev + 1))}
              aria-label="Increase suggestion limit"
              className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-main)] flex items-center justify-center text-[var(--text-primary)] hover:border-[var(--accent-bg)] transition-transform active:scale-95 cursor-pointer"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => advanceToStage(4)}
        className="self-end py-1.5 px-3 rounded-xl bg-[var(--accent-bg)] text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
      >
        <span>Next: Quorum</span>
        <ArrowRight size={12} />
      </button>
    </div>
  );
}
