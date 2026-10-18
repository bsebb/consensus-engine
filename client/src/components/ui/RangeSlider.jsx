import React from 'react';
import { triggerHaptic } from '../../utils/haptics';

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

  const handleChange = (e) => {
    const val = Number(e.target.value);
    if (val !== value) {
      triggerHaptic('selection');
      onChange?.(val);
    }
  };

  return (
    <div className={`w-full flex flex-col gap-2 ${className}`}>
      {(label || valueDisplay !== undefined) && (
        <div className="flex items-center justify-between text-xs">
          {label && <span className="font-medium text-[var(--text-secondary)]">{label}</span>}
          <span className="font-bold text-[var(--text-primary)] tabular-nums">
            {valueDisplay !== undefined ? valueDisplay : `${value}${unit ? ` ${unit}` : ''}`}
          </span>
        </div>
      )}

      {/* Slider Track and Thumb Chassis - Zero Artifact Bleed */}
      <div className="relative w-full flex items-center h-7 select-none">
        {/* Recessed Hairline Track */}
        <div className="w-full h-1.5 rounded-full bg-[var(--bg-inset)] border border-[var(--border-subtle)] overflow-hidden pointer-events-none relative">
          {/* Active Accent Fill Bar */}
          <div
            className="h-full bg-[var(--accent-bg)] rounded-l-full"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Elevated Tactile Thumb */}
        <div
          className="absolute w-5 h-5 rounded-full bg-white border-2 border-[var(--accent-bg)] shadow-[0_2px_8px_rgba(0,0,0,0.35)] pointer-events-none"
          style={{
            left: `calc(${percentage}% - 10px)`,
          }}
        />

        {/* Native Interactive Input Overlay for Smooth Touch & Keyboard Scrubbing */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 touch-none"
        />
      </div>
    </div>
  );
}
