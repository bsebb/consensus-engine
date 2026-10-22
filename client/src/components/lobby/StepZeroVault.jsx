import React from 'react';
import { Coins, Check } from 'lucide-react';

const BUDGET_TIERS = [
  { label: 'Any', sub: 'All spots', limit: 600, isFiltered: false },
  { label: '$', sub: '<150', limit: 150, isFiltered: true },
  { label: '$$', sub: '<300', limit: 300, isFiltered: true },
  { label: '$$$', sub: '<500', limit: 450, isFiltered: true },
];

export default function StepZeroVault({
  lockedConstraint,
  budgetLimit,
  onSelectTier,
}) {
  const activeTierIndex = !lockedConstraint
    ? 0
    : budgetLimit <= 180
    ? 1
    : budgetLimit <= 350
    ? 2
    : 3;

  return (
    <section className="shrink-0 p-2.5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-main)] flex flex-col gap-1.5 shadow-2xs">
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-1.5">
          <Coins size={13} className="text-amber-500" />
          <h3 className="text-[11px] font-bold text-[var(--text-primary)]">
            Price Filter
          </h3>
          <span className="text-[10px] text-[var(--text-tertiary)]">
            (Anonymous • MDL)
          </span>
        </div>

        {lockedConstraint && (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
            <Check size={11} className="text-emerald-500" />
            <span>Max {budgetLimit} MDL</span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {BUDGET_TIERS.map((tier, idx) => {
          const isActive = activeTierIndex === idx;
          return (
            <button
              key={tier.label}
              type="button"
              onClick={() => onSelectTier(tier.limit, tier.isFiltered)}
              className={`flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-xl border text-center transition-all cursor-pointer min-h-[36px] ${
                isActive
                  ? 'border-[var(--accent-bg)] bg-[var(--accent-bg)]/10 text-[var(--text-primary)] shadow-2xs'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-inset)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span className={`text-xs font-bold leading-none ${isActive ? 'text-[var(--accent-bg)]' : 'text-[var(--text-primary)]'}`}>
                {tier.label}
              </span>
              <span className="text-[10px] text-[var(--text-tertiary)] tabular-nums leading-none">
                {tier.sub}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
