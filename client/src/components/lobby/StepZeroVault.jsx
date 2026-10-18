import React from 'react';
import { Coins, Check } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { triggerHaptic } from '../../utils/haptics';

export default function StepZeroVault({
  lockedConstraint,
  budgetLimit,
  onSelectTier,
}) {
  const { t } = useLanguage();

  const activeTierIndex = !lockedConstraint
    ? 0
    : budgetLimit <= 180
    ? 1
    : budgetLimit <= 350
    ? 2
    : 3;

  const tiers = [
    { label: t('anyPrice'), sub: t('allSpots'), limit: 600, isFiltered: false },
    { label: '$', sub: '< 150 MDL', limit: 150, isFiltered: true },
    { label: '$$', sub: '< 300 MDL', limit: 300, isFiltered: true },
    { label: '$$$', sub: '< 500 MDL', limit: 450, isFiltered: true },
  ];

  const handleTierClick = (limit, isFiltered) => {
    triggerHaptic('selection');
    onSelectTier?.(limit, isFiltered);
  };

  return (
    <section className="p-4 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-main)] flex flex-col gap-2.5 shadow-2xs">
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-2">
          <Coins size={15} className="text-amber-500" />
          <h3 className="text-xs font-bold text-[var(--text-primary)]">
            {t('priceFilter')}
          </h3>
          <span className="text-[11px] text-[var(--text-tertiary)]">
            {t('anonymousHint')}
          </span>
        </div>

        {lockedConstraint && (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <Check size={12} className="text-emerald-500" />
            <span>{t('maxBudgetLabel')} {budgetLimit} MDL</span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {tiers.map((tier, idx) => {
          const isActive = activeTierIndex === idx;
          return (
            <button
              key={tier.label + idx}
              type="button"
              onClick={() => handleTierClick(tier.limit, tier.isFiltered)}
              className={`flex flex-col items-center justify-center py-2 px-1.5 rounded-2xl border text-center transition-all cursor-pointer min-h-[48px] active:scale-[0.96] ${
                isActive
                  ? 'border-[var(--accent-bg)] bg-[var(--accent-bg)]/10 text-[var(--text-primary)] shadow-2xs'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-inset)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span className={`text-xs font-bold leading-tight ${isActive ? 'text-[var(--accent-bg)]' : 'text-[var(--text-primary)]'}`}>
                {tier.label}
              </span>
              <span className="text-[10px] text-[var(--text-tertiary)] mt-0.5 tabular-nums">
                {tier.sub}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
