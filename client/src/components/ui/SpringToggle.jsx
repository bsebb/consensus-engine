import React from 'react';

export default function SpringToggle({
  checked = false,
  onChange,
  disabled = false,
  label,
  description,
  id,
  className = '',
}) {
  const toggleId = id || (label ? `toggle-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div className={`flex items-center justify-between gap-3 ${className}`}>
      {(label || description) && (
        <label htmlFor={toggleId} className="flex flex-col cursor-pointer select-none">
          {label && <span className="text-sm font-medium text-[var(--ios-label)]">{label}</span>}
          {description && (
            <span className="text-xs text-[var(--ios-secondary-label)]">{description}</span>
          )}
        </label>
      )}
      <input
        id={toggleId}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="spring-toggle cursor-pointer"
      />
    </div>
  );
}
