import React from 'react';
import { ArrowRight } from 'lucide-react';

export default function HostCategoryPicker({
  mode,
  categories,
  category,
  handleSelectCategory,
  topic,
  setTopic,
  advanceToStage,
}) {
  return (
    <div className="accordion-drawer-inner p-3.5 pt-0 border-t border-[var(--border-subtle)]/50 mt-1 flex flex-col gap-3">
      {mode === 'DISCOVERY' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
          {categories.map((cat) => {
            const isSelected = category === cat.label;
            const IconComp = cat.icon;
            return (
              <button
                key={cat.label}
                type="button"
                onClick={() => handleSelectCategory(cat.label)}
                className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all duration-150 cursor-pointer active:scale-95 min-h-[76px] ${
                  isSelected
                    ? 'border-[var(--accent-bg)] bg-[var(--accent-bg)]/10 text-[var(--accent-bg)] shadow-[0_4px_16px_var(--accent-glow-subtle)] ring-1 ring-[var(--accent-bg)]'
                    : 'bg-[var(--bg-inset)] border-[var(--border-main)] text-[var(--text-primary)] hover:border-[var(--text-tertiary)]'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1 transition-all ${
                    isSelected
                      ? 'bg-[var(--accent-bg)] text-white shadow-sm scale-105'
                      : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                  }`}
                >
                  <IconComp size={16} />
                </div>
                <span className="text-[11px] font-bold tracking-tight">{cat.label}</span>
                <span className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
                  {cat.desc}
                </span>
                {isSelected && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--accent-bg)] animate-checkmark-pop" />
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-2 pt-1">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Which team offsite venue?"
            className="w-full text-xs font-semibold rounded-xl p-3 bg-[var(--bg-inset)] border border-[var(--border-main)] focus:border-[var(--accent-bg)] outline-none text-[var(--text-primary)]"
          />
          <button
            type="button"
            onClick={() => advanceToStage(3)}
            className="self-end py-1.5 px-3 rounded-xl bg-[var(--accent-bg)] text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
          >
            <span>Next: Constraints</span>
            <ArrowRight size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
