import React from 'react';

export default function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
  icon: Icon,
  type = 'button',
  ...props
}) {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5 min-h-[36px]',
    md: 'px-4 py-2.5 text-sm rounded-lg gap-2 font-medium min-h-[42px]',
    lg: 'px-6 py-3.5 text-base rounded-xl gap-2.5 font-semibold min-h-[48px]',
  }[size] || 'px-4 py-2.5 text-sm rounded-lg gap-2 min-h-[42px]';

  const variantClasses = {
    primary:
      'bg-[var(--accent-bg)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_3px_12px_var(--accent-glow)] hover:shadow-[0_6px_18px_var(--accent-glow-hover)] border border-transparent',
    secondary:
      'bg-black/5 dark:bg-white/10 text-[var(--text-primary)] hover:bg-black/10 dark:hover:bg-white/15 border border-[var(--border-main)] shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
    destructive:
      'bg-[var(--status-danger)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_3px_12px_rgba(239,68,68,0.35)] hover:shadow-[0_6px_18px_rgba(239,68,68,0.5)] border border-transparent',
    ghost:
      'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 border border-transparent',
    glass:
      'glass-surface text-[var(--text-primary)] hover:bg-white/90 dark:hover:bg-black/60 shadow-[0_4px_16px_rgba(0,0,0,0.06)]',
  }[variant] || 'bg-[var(--accent-bg)] text-white';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center select-none transition-all duration-150 cursor-pointer active:scale-[0.96] disabled:opacity-45 disabled:pointer-events-none disabled:cursor-not-allowed ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        Icon && <Icon size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} className="shrink-0" />
      )}
      {children}
    </button>
  );
}
