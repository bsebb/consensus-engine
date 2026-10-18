import React, { useRef, useState, useLayoutEffect, useCallback, useEffect } from 'react';
import { triggerHaptic } from '../../utils/haptics';

export default function SegmentedControl({
  options = [],
  value,
  onChange,
  className = '',
  size = 'md',
  variant = 'default', // 'default' (surface thumb) | 'accent' (accent thumb)
}) {
  const containerRef = useRef(null);
  const buttonRefs = useRef(new Map());
  const [thumbMetrics, setThumbMetrics] = useState({ left: 0, top: 0, width: 0, height: 0, ready: false });
  const [isMounted, setIsMounted] = useState(false);

  const updateThumbMetrics = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const activeButton = buttonRefs.current.get(value);
    if (!activeButton) {
      setThumbMetrics((prev) => ({ ...prev, ready: false }));
      return;
    }

    const left = activeButton.offsetLeft;
    const top = activeButton.offsetTop;
    const width = activeButton.offsetWidth;
    const height = activeButton.offsetHeight;

    setThumbMetrics((prev) => {
      if (
        prev.left === left &&
        prev.top === top &&
        prev.width === width &&
        prev.height === height &&
        prev.ready
      ) {
        return prev;
      }
      return { left, top, width, height, ready: true };
    });
  }, [value]);

  useLayoutEffect(() => {
    updateThumbMetrics();
  }, [updateThumbMetrics, options, value]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;

    const ro = new ResizeObserver(() => {
      updateThumbMetrics();
    });

    ro.observe(container);
    buttonRefs.current.forEach((btn) => {
      if (btn) ro.observe(btn);
    });

    return () => ro.disconnect();
  }, [updateThumbMetrics]);

  // Strict Concentric Radii: R_inner = R_outer - padding
  // sm: outer rounded-lg (8px), padding 2px (p-0.5) -> inner rounded-md (6px)
  // md: outer rounded-xl (12px), padding 4px (p-1) -> inner rounded-lg (8px)
  // lg: outer rounded-2xl (16px), padding 6px (p-1.5) -> inner rounded-[10px] (10px)
  const sizeConfig = {
    sm: {
      container: 'rounded-lg p-0.5 text-xs',
      thumb: 'rounded-md',
      btn: 'py-1 px-2 min-h-[30px] rounded-md text-xs',
    },
    md: {
      container: 'rounded-xl p-1 text-sm',
      thumb: 'rounded-lg',
      btn: 'py-1.5 px-3 min-h-[36px] rounded-lg text-xs sm:text-sm',
    },
    lg: {
      container: 'rounded-2xl p-1.5 text-sm sm:text-base',
      thumb: 'rounded-[10px]',
      btn: 'py-2 px-3.5 min-h-[42px] rounded-[10px] text-sm',
    },
  }[size] || {
    container: 'rounded-xl p-1 text-sm',
    thumb: 'rounded-lg',
    btn: 'py-1.5 px-3 min-h-[36px] rounded-lg text-xs sm:text-sm',
  };

  const handleSelect = (newVal) => {
    if (newVal !== value) {
      triggerHaptic('selection');
      onChange?.(newVal);
    }
  };

  const isAccent = variant === 'accent';

  return (
    <div
      ref={containerRef}
      role="tablist"
      className={`relative inline-flex items-center w-full bg-[var(--bg-inset)] border border-[var(--border-subtle)] ${sizeConfig.container} select-none ${className}`}
    >
      {/* 60fps GPU Sliding Indicator Thumb (Strict Concentric & Borderless) */}
      <div
        aria-hidden="true"
        className={`seg-thumb absolute top-0 left-0 m-0 ${sizeConfig.thumb} pointer-events-none z-10 ${
          isAccent
            ? 'bg-[var(--accent-bg)] text-white shadow-[0_2px_8px_rgba(0,0,0,0.18)]'
            : 'bg-white dark:bg-[var(--bg-elevated)] shadow-[0_1px_3px_rgba(0,0,0,0.14),0_2px_6px_rgba(0,0,0,0.06)]'
        } ${!isMounted || !thumbMetrics.ready ? 'opacity-0' : 'opacity-100'}`}
        style={{
          top: 0,
          left: 0,
          bottom: 'auto',
          margin: 0,
          border: 'none',
          transform: `translate3d(${thumbMetrics.left}px, ${thumbMetrics.top}px, 0)`,
          width: thumbMetrics.width > 0 ? `${thumbMetrics.width}px` : undefined,
          height: thumbMetrics.height > 0 ? `${thumbMetrics.height}px` : undefined,
          transition: isMounted && thumbMetrics.ready
            ? 'transform 0.26s cubic-bezier(0.16, 1, 0.3, 1), width 0.26s cubic-bezier(0.16, 1, 0.3, 1), height 0.26s cubic-bezier(0.16, 1, 0.3, 1)'
            : 'none',
        }}
      />

      {/* Segment Buttons */}
      {options.map((opt) => {
        const isSelected = opt.value === value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            ref={(el) => {
              if (el) buttonRefs.current.set(opt.value, el);
              else buttonRefs.current.delete(opt.value);
            }}
            role="tab"
            type="button"
            aria-selected={isSelected}
            onClick={() => handleSelect(opt.value)}
            className={`relative z-20 flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 ${sizeConfig.btn} font-bold cursor-pointer transition-colors duration-150 active:scale-[0.98] ${
              isSelected
                ? isAccent
                  ? 'text-white'
                  : 'text-[var(--text-primary)] font-bold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {Icon && <Icon size={14} className="shrink-0" />}
            <span className="tabular-nums tracking-tight">{opt.label}</span>
            {opt.sub && (
              <span className={`text-[10px] tabular-nums font-normal ${isSelected && isAccent ? 'text-white/80' : 'text-[var(--text-tertiary)]'}`}>
                {opt.sub}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
