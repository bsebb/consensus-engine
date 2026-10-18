import React, { useState, useEffect } from 'react';
import { Compass, Sparkles, MapPin } from 'lucide-react';

const RESTAURANT_STEPS = [
  'Partitioning neighborhood hex grid...',
  'Scanning top-rated local venues...',
  'Calculating road routes & travel times...',
  'Curating balanced consensus deck...',
];

const CUSTOM_STEPS = [
  'Initializing consensus room...',
  'Formatting custom poll ballot...',
  'Assigning room code & real-time sync...',
];

export default function HexagonLoadingOverlay({
  isOpen = false,
  category = 'restaurants',
  locationLabel = '',
  isCustom = false,
}) {
  const [stepIdx, setStepIdx] = useState(0);
  const steps = isCustom ? CUSTOM_STEPS : RESTAURANT_STEPS;

  useEffect(() => {
    if (!isOpen) {
      setStepIdx(0);
      return;
    }
    const interval = setInterval(() => {
      setStepIdx((prev) => (prev + 1) % steps.length);
    }, 1400);
    return () => clearInterval(interval);
  }, [isOpen, steps.length]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Finding local spots"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-black/85 backdrop-blur-xl animate-fade-in select-none text-white text-center"
    >
      {/* Central Concentric Hexagon Radar */}
      <div className="relative w-36 h-36 flex items-center justify-center mb-6">
        {/* Outer Hexagon Ring */}
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 w-full h-full text-[var(--accent-bg)] opacity-30 animate-[spin_14s_linear_infinite]"
        >
          <polygon
            points="50,3 93,25 93,75 50,97 7,75 7,25"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="6 4"
          />
        </svg>

        {/* Middle Hexagon Ring */}
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-2 w-[calc(100%-16px)] h-[calc(100%-16px)] text-amber-400 opacity-50 animate-[spin_9s_linear_infinite_reverse]"
        >
          <polygon
            points="50,6 88,28 88,72 50,94 12,72 12,28"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          />
        </svg>

        {/* Inner Hexagon Core */}
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-5 w-[calc(100%-40px)] h-[calc(100%-40px)] text-emerald-400 opacity-80 animate-pulse"
        >
          <polygon
            points="50,10 85,30 85,70 50,90 15,70 15,30"
            fill="currentColor"
            fillOpacity="0.12"
            stroke="currentColor"
            strokeWidth="3"
          />
        </svg>

        {/* Center Pulse Icon */}
        <div className="relative z-10 w-12 h-12 rounded-2xl bg-[var(--accent-bg)]/20 border border-[var(--accent-bg)]/50 text-[var(--accent-bg)] flex items-center justify-center shadow-[0_0_24px_var(--accent-glow)]">
          {isCustom ? <Sparkles size={22} /> : <Compass size={22} className="animate-spin" />}
        </div>
      </div>

      {/* Dynamic Animated Status Message */}
      <div className="max-w-xs space-y-2 mb-6">
        <h3 className="text-lg font-black tracking-tight text-white h-7 flex items-center justify-center transition-all duration-300">
          {steps[stepIdx]}
        </h3>
        {locationLabel && !isCustom && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-semibold text-zinc-300">
            <MapPin size={12} className="text-amber-400 shrink-0" />
            <span className="truncate max-w-[220px]">{locationLabel}</span>
          </div>
        )}
      </div>

      {/* Shimmering Skeleton Preview Cards */}
      <div className="w-full max-w-xs space-y-2.5 opacity-75">
        <div className="h-14 rounded-2xl bg-white/10 border border-white/10 p-3 flex items-center gap-3 animate-pulse">
          <div className="w-10 h-10 rounded-xl bg-white/20 shrink-0" />
          <div className="flex-1 space-y-1.5 text-left">
            <div className="h-3.5 bg-white/30 rounded-md w-3/4" />
            <div className="h-2.5 bg-white/15 rounded-md w-1/2" />
          </div>
          <div className="w-10 h-5 bg-white/20 rounded-full" />
        </div>

        <div className="h-14 rounded-2xl bg-white/10 border border-white/10 p-3 flex items-center gap-3 animate-pulse [animation-delay:200ms]">
          <div className="w-10 h-10 rounded-xl bg-white/20 shrink-0" />
          <div className="flex-1 space-y-1.5 text-left">
            <div className="h-3.5 bg-white/30 rounded-md w-2/3" />
            <div className="h-2.5 bg-white/15 rounded-md w-2/5" />
          </div>
          <div className="w-10 h-5 bg-white/20 rounded-full" />
        </div>
      </div>

      {/* Micro Info Caption */}
      <p className="text-[11px] font-medium text-zinc-400 mt-6 max-w-xs leading-relaxed">
        {isCustom
          ? 'Preparing your custom room and sync engine...'
          : 'Filtering through local spots to curate the top 6-8 contenders.'}
      </p>
    </div>
  );
}
