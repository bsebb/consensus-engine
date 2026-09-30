import React from 'react';

export default function StatusBadge({
  status = 'neutral',
  label,
  pulse = false,
  size = 'md',
  className = '',
  mono = false,
}) {
  const statusStyles = {
    success: 'bg-[rgba(52,199,89,0.12)] text-[var(--semantic-success)] border-[rgba(52,199,89,0.25)]',
    warning: 'bg-[rgba(255,149,0,0.12)] text-[var(--semantic-warning)] border-[rgba(255,149,0,0.25)]',
    error: 'bg-[rgba(255,59,48,0.12)] text-[var(--semantic-error)] border-[rgba(255,59,48,0.25)]',
    info: 'bg-[rgba(0,122,255,0.12)] text-[var(--semantic-info)] border-[rgba(0,122,255,0.25)]',
    neutral: 'bg-black/5 dark:bg-white/10 text-[var(--ios-secondary-label)] border-[var(--border-subtle)]',
  }[status] || 'bg-black/5 text-[var(--ios-secondary-label)] border-[var(--border-subtle)]';

  const dotColors = {
    success: 'bg-[var(--semantic-success)]',
    warning: 'bg-[var(--semantic-warning)]',
    error: 'bg-[var(--semantic-error)]',
    info: 'bg-[var(--semantic-info)]',
    neutral: 'bg-[var(--ios-tertiary-label)]',
  }[status] || 'bg-current';

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  }[size] || 'text-xs px-2.5 py-1 gap-1.5';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] select-none ${sizeClasses} ${statusStyles} ${
        mono ? 'font-mono' : ''
      } ${className}`}
    >
      {pulse ? (
        <span className="relative flex h-2 w-2">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotColors}`}
          />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColors}`} />
        </span>
      ) : (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors}`} />
      )}
      {label}
    </span>
  );
}
