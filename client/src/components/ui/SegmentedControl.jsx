import React, { useRef, useState, useLayoutEffect, useCallback, useEffect } from 'react';

export default function SegmentedControl({
  options = [],
  value,
  onChange,
  className = '',
  size = 'md',
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
  }, [updateThumbMetrics, options]);

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

  const sizeClasses = {
    sm: 'p-0.5 text-xs',
    md: 'p-1 text-sm',
    lg: 'p-1 text-sm sm:p-1.5 sm:text-base',
  }[size] || 'p-1 text-sm';

  const btnPadding = {
    sm: 'py-1 px-2.5 min-h-[32px]',
    md: 'py-1.5 px-3.5 min-h-[36px]',
    lg: 'py-2 px-4 min-h-[40px]',
  }[size] || 'py-1.5 px-3.5 min-h-[36px]';

  return (
    <div
      ref={containerRef}
      role="tablist"
      className={`relative inline-flex items-center w-full bg-black/[0.04] dark:bg-white/[0.06] border border-[var(--border-subtle)] rounded-lg ${sizeClasses} select-none ${className}`}
    >
      {/* 60fps GPU Sliding Indicator Thumb (INV-03) */}
      <div
        aria-hidden="true"
        className={`seg-thumb absolute top-0 left-0 m-0 rounded-md bg-white dark:bg-[var(--bg-elevated)] shadow-[0_1px_4px_rgba(0,0,0,0.12),0_1px_1px_rgba(0,0,0,0.06)] border border-black/[0.04] dark:border-white/[0.08] pointer-events-none z-10 ${
          !isMounted || !thumbMetrics.ready ? 'opacity-0' : 'opacity-100'
        }`}
        style={{
          top: 0,
          left: 0,
          bottom: 'auto',
          margin: 0,
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
            onClick={() => onChange(opt.value)}
            className={`relative z-20 flex-1 flex items-center justify-center gap-1.5 ${btnPadding} rounded-md font-medium cursor-pointer transition-colors duration-150 ${
              isSelected
                ? 'text-[var(--text-primary)] font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {Icon && <Icon size={15} className="shrink-0" />}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
