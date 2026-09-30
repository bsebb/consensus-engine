import React from 'react';

export default function SegmentedControl({
  options = [],
  value,
  onChange,
  className = '',
  size = 'md',
}) {
  const sizeClasses = {
    sm: 'p-0.5 text-xs',
    md: 'p-1 text-sm',
    lg: 'p-1.5 text-base',
  }[size] || 'p-1 text-sm';

  return (
    <div
      role="tablist"
      className={`inline-flex items-center w-full bg-black/[0.04] dark:bg-white/[0.08] border border-[var(--border-subtle)] rounded-xl ${sizeClasses} select-none ${className}`}
    >
      {options.map((opt) => {
        const isSelected = opt.value === value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            role="tab"
            type="button"
            aria-selected={isSelected}
            onClick={() => onChange(opt.value)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg font-medium transition-all duration-150 cursor-pointer ${
              isSelected
                ? 'bg-white dark:bg-[#2C2C2E] text-[var(--ios-label)] shadow-[0_2px_8px_rgba(0,0,0,0.12)] border border-black/[0.04] dark:border-white/[0.06]'
                : 'text-[var(--ios-secondary-label)] hover:text-[var(--ios-label)]'
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
