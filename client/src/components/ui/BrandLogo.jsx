import React from 'react';

/**
 * NoYouPick Bespoke Brand Emblem
 * Two fanned swipe cards (Electric Violet & Flame Coral) with a radiant Consensus Spark.
 */
export default function BrandLogo({ size = 32, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="logoBackGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="100%" stopColor="#4F46E5" />
        </linearGradient>

        <linearGradient id="logoFrontGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF6B5B" />
          <stop offset="50%" stopColor="#F04D3E" />
          <stop offset="100%" stopColor="#D93828" />
        </linearGradient>

        <linearGradient id="logoGlossGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>

        <filter id="logoFrontShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="-2" dy="4" stdDeviation="4" floodColor="#0a0d14" floodOpacity="0.45" />
        </filter>
      </defs>

      {/* Back Tilted Card: Electric Indigo (Tilt: -14 deg) */}
      <g transform="translate(46, 62) rotate(-14) translate(-22, -32)">
        <rect width="44" height="64" rx="10" fill="url(#logoBackGrad)" />
        <rect width="44" height="64" rx="10" stroke="url(#logoGlossGrad)" strokeWidth="1" />
        <rect x="6" y="7" width="32" height="22" rx="4" fill="#FFFFFF" fillOpacity="0.2" />
        <rect x="6" y="34" width="20" height="4" rx="2" fill="#FFFFFF" fillOpacity="0.45" />
        <rect x="6" y="42" width="28" height="3" rx="1.5" fill="#FFFFFF" fillOpacity="0.25" />
      </g>

      {/* Front Tilted Card: Flame Coral (Tilt: +10 deg) */}
      <g transform="translate(74, 60) rotate(10) translate(-22, -32)" filter="url(#logoFrontShadow)">
        <rect width="44" height="64" rx="10" fill="url(#logoFrontGrad)" />
        <rect width="44" height="64" rx="10" stroke="url(#logoGlossGrad)" strokeWidth="1.2" />
        <rect x="6" y="7" width="32" height="23" rx="4" fill="#FFFFFF" fillOpacity="0.25" />
        {/* Tiny Heart / Match */}
        <path
          d="M22 14.5 C22 13 20 11.5 18 11.5 C15.5 11.5 14 13.5 14 15.5 C14 19 19.5 22.5 22 24 C24.5 22.5 30 19 30 15.5 C30 13.5 28.5 11.5 26 11.5 C24 11.5 22 13 22 14.5 Z"
          fill="#FFFFFF"
          fillOpacity="0.95"
        />
        <rect x="6" y="35" width="24" height="4" rx="2" fill="#FFFFFF" fillOpacity="0.9" />
        <rect x="6" y="43" width="30" height="3" rx="1.5" fill="#FFFFFF" fillOpacity="0.5" />
      </g>

      {/* Radiant Consensus Spark (Center Top) */}
      <g transform="translate(62, 32)">
        <path
          d="M0 -15 Q0 0 -15 0 Q0 0 0 15 Q0 0 15 0 Q0 0 0 -15 Z"
          fill="#FFFFFF"
        />
        <circle cx="0" cy="0" r="2.5" fill="#FDE047" />
      </g>

      {/* Mini Accent Star */}
      <circle cx="92" cy="24" r="2" fill="#FDE047" opacity="0.9" />
    </svg>
  );
}
