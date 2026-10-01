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
    success: 'bg-[rgba(16,185,129,0.12)] text-[var(--status-success)] border-[rgba(16,185,129,0.25)]',
    warning: 'bg-[rgba(245,158,11,0.12)] text-[var(--status-warning)] border-[rgba(245,158,11,0.25)]',
    error: 'bg-[rgba(239,68,68,0.12)] text-[var(--status-danger)] border-[rgba(239,68,68,0.25)]',
    info: 'bg-[rgba(99,102,241,0.12)] text-[var(--status-info)] border-[rgba(99,102,241,0.25)]',
    neutral: 'bg-black/5 dark:bg-white/10 text-[var(--text-secondary)] border-[var(--border-subtle)]',
  }[status] || 'bg-black/5 text-[var(--text-secondary)] border-[var(--border-subtle)]';

  const dotColors = {
    success: 'bg-[var(--status-success)]',
    warning: 'bg-[var(--status-warning)]',
    error: 'bg-[var(--status-danger)]',
    info: 'bg-[var(--status-info)]',
    neutral: 'bg-[var(--text-tertiary)]',
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
