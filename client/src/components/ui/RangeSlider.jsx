import React from 'react';

export default function RangeSlider({
  min = 0,
  max = 100,
  step = 1,
  value,
  onChange,
  unit = '',
  label,
  valueDisplay,
  className = '',
}) {
  const percentage = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  return (
    <div className={`w-full flex flex-col gap-1.5 ${className}`}>
      {(label || valueDisplay !== undefined) && (
        <div className="flex items-center justify-between text-xs">
          {label && <span className="font-medium text-[var(--text-secondary)]">{label}</span>}
          <span className="font-semibold text-[var(--text-primary)] font-mono tabular-nums">
            {valueDisplay !== undefined ? valueDisplay : `${value}${unit ? ` ${unit}` : ''}`}
          </span>
        </div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          background: `linear-gradient(to right, var(--accent-bg) ${percentage}%, var(--bg-inset) ${percentage}%)`,
        }}
        className="calibrated-slider"
      />
    </div>
  );
}
