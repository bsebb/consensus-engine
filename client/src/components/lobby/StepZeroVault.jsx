import React from 'react';
import { ShieldCheck, Check } from 'lucide-react';
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
    { id: 'all', label: t('budgetAll') || 'Toate', limit: 600, isFiltered: false, desc: t('budgetDescAll') },
    { id: '1', label: '$', limit: 150, isFiltered: true, desc: t('budgetDesc1') },
    { id: '2', label: '$$', limit: 300, isFiltered: true, desc: t('budgetDesc2') },
    { id: '3', label: '$$$', limit: 450, isFiltered: true, desc: t('budgetDesc3') },
  ];

  const handleTierClick = (limit, isFiltered) => {
    triggerHaptic('selection');
    onSelectTier?.(limit, isFiltered);
  };

  const activeTier = tiers[activeTierIndex] || tiers[0];

  return (
    <section className="p-3.5 sm:p-4 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-main)] flex flex-col gap-2.5 shadow-2xs">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-[var(--accent-bg)] shrink-0" />
          <h3 className="text-xs font-bold text-[var(--text-primary)]">
            {t('priceFilter')}
          </h3>
          <span className="text-[10px] font-medium text-[var(--text-tertiary)] bg-[var(--bg-inset)] px-2 py-0.5 rounded-full border border-[var(--border-subtle)]">
            {t('anonymousHint')}
          </span>
        </div>

        {lockedConstraint && (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <Check size={11} className="text-emerald-500" />
            <span className="tabular-nums">{t('maxBudgetLabel')} {budgetLimit} MDL</span>
          </span>
        )}
      </div>

      {/* Modern iOS Sliding Segmented Track */}
      <div className="p-1 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)] grid grid-cols-4 gap-1">
        {tiers.map((tier, idx) => {
          const isActive = activeTierIndex === idx;
          return (
            <button
              key={tier.id}
              type="button"
              onClick={() => handleTierClick(tier.limit, tier.isFiltered)}
              className={`py-2 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center min-h-[38px] active:scale-[0.96] ${
                isActive
                  ? 'bg-[var(--accent-bg)] text-white shadow-2xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <span className="tabular-nums">{tier.label}</span>
            </button>
          );
        })}
      </div>

      {/* Human Explanatory Subtitle */}
      <div className="px-1 text-[11px] text-[var(--text-tertiary)] flex items-center justify-between">
        <span className="truncate">{activeTier.desc}</span>
      </div>
    </section>
  );
}
