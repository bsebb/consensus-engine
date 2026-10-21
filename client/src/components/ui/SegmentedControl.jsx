import React, { useState, useEffect } from 'react';
import { triggerHaptic } from '../../utils/haptics';

export default function SegmentedControl({
  options = [],
  value,
  onChange,
  className = '',
  size = 'md',
  variant = 'default', // 'default' (surface thumb) | 'accent' (accent thumb)
  pill = false,
}) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // Strict Concentric Radii Law: R_inner = R_outer - padding
  // sm: outer 10px, padding 2.5px -> inner 7.5px
  // md: outer 12px, padding 3px   -> inner 9px
  // lg: outer 14px, padding 3.5px -> inner 10.5px
  // pill: outer 9999px, padding 3px -> inner 9999px
  const sizeConfigs = {
    sm: {
      padding: '3px',
      trackRadius: pill ? '9999px' : '12px',
      innerRadius: pill ? '9999px' : '9px',
      btn: 'py-1.5 px-2.5 min-h-[34px] text-xs font-semibold',
      text: 'text-xs',
    },
    md: {
      padding: '3px',
      trackRadius: pill ? '9999px' : '14px',
      innerRadius: pill ? '9999px' : '11px',
      btn: 'py-2 px-3 min-h-[38px] text-xs sm:text-sm font-semibold',
      text: 'text-sm',
    },
    lg: {
      padding: '3.5px',
      trackRadius: pill ? '9999px' : '16px',
      innerRadius: pill ? '9999px' : '12.5px',
      btn: 'py-2 px-3.5 min-h-[42px] text-sm font-semibold',
      text: 'text-sm sm:text-base',
    },
  };
  const cfg = sizeConfigs[size] || sizeConfigs.md;

  const handleSelect = (newVal) => {
    if (newVal !== value) {
      triggerHaptic('selection');
      onChange?.(newVal);
    }
  };

  const isAccent = variant === 'accent';
  const activeIndex = options.findIndex((opt) => opt.value === value);
  const safeIndex = activeIndex >= 0 ? activeIndex : 0;
  const count = Math.max(1, options.length);

  return (
    <div
      role="tablist"
      style={{
        borderRadius: cfg.trackRadius,
        padding: cfg.padding,
      }}
      className={`relative inline-flex items-stretch w-full bg-[var(--bg-inset)] border border-[var(--border-subtle)] ${cfg.text} select-none ${className}`}
    >
      {/* 60fps GPU Sliding Indicator Thumb (Strict Concentric & Borderless) */}
      <div
        aria-hidden="true"
        data-sliding-thumb="true"
        className={`absolute pointer-events-none z-10 ${
          isAccent
            ? 'shadow-[0_2px_8px_var(--accent-glow)]'
            : 'bg-[var(--bg-elevated)] shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] border border-[var(--border-subtle)] dark:border-[var(--border-main)]'
        } ${!isMounted || activeIndex < 0 ? 'opacity-0' : 'opacity-100'}`}
        style={{
          top: cfg.padding,
          bottom: cfg.padding,
          left: cfg.padding,
          width: `calc((100% - (${cfg.padding} * 2)) / ${count})`,
          borderRadius: cfg.innerRadius,
          transform: `translate3d(calc(${safeIndex} * 100%), 0, 0)`,
          backgroundColor: isAccent ? 'var(--accent-bg)' : undefined,
          transition: isMounted && activeIndex >= 0
            ? 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), background-color 300ms cubic-bezier(0.16, 1, 0.3, 1), border-color 300ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 300ms cubic-bezier(0.16, 1, 0.3, 1), opacity 0.15s ease'
            : 'none',
          willChange: 'transform',
        }}
      />

      {/* Segment Buttons */}
      {options.map((opt) => {
        const isSelected = opt.value === value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            role="tab"
            type="button"
            aria-selected={isSelected}
            onClick={() => handleSelect(opt.value)}
            style={{
              borderRadius: cfg.innerRadius,
            }}
            className={`relative z-20 flex-1 flex flex-row items-center justify-center gap-1.5 ${cfg.btn} font-bold cursor-pointer transition-colors duration-200 active:scale-[0.98] min-w-0 text-center ${
              isSelected
                ? isAccent
                  ? 'text-white'
                  : 'text-[var(--text-primary)] font-bold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {Icon && <Icon size={14} className="shrink-0" />}
            <span className="tabular-nums tracking-tight truncate">{opt.label}</span>
            {opt.sub && (
              <span className={`text-[10px] tabular-nums font-normal shrink-0 ${isSelected && isAccent ? 'text-white/80' : 'text-[var(--text-tertiary)]'}`}>
                {opt.sub}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
