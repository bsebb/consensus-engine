import React from 'react';
import { ShieldCheck, Check } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { triggerHaptic } from '../../utils/haptics';
import { resolveRegionProfile, formatRegionalMaxBudget } from '../../utils/regionFormat';
import SegmentedControl from '../ui/SegmentedControl';

export default function StepZeroVault({
  lockedConstraint,
  budgetLimit,
  onSelectTier,
  locationContext,
}) {
  const { t } = useLanguage();
  const profile = resolveRegionProfile(locationContext);

  const activeTierIndex = !lockedConstraint
    ? 0
    : budgetLimit <= 180
    ? 1
    : budgetLimit <= 350
    ? 2
    : 3;

  const tiers = [
    { id: 'all', label: t('budgetAll') || 'All', limit: 600, isFiltered: false, desc: t('budgetDescAll') },
    { id: '1', label: profile.tiers[1].symbolRepeat, limit: 150, isFiltered: true, desc: `${t('budgetDesc1')} (${profile.tiers[1].short})` },
    { id: '2', label: profile.tiers[2].symbolRepeat, limit: 300, isFiltered: true, desc: `${t('budgetDesc2')} (${profile.tiers[2].short})` },
    { id: '3', label: profile.tiers[3].symbolRepeat, limit: 450, isFiltered: true, desc: `${t('budgetDesc3')} (${profile.tiers[3].short})` },
  ];

  const activeTier = tiers[activeTierIndex] || tiers[0];

  return (
    <section className="shrink-0 p-3 sm:p-3.5 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-main)] flex flex-col gap-2 shadow-2xs">
      <div className="flex flex-wrap gap-2 items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={14} className="text-[var(--accent-bg)] shrink-0" />
          <h3 className="text-xs font-bold text-[var(--text-primary)]">
            {t('priceFilter')}
          </h3>
          <span className="text-[10px] font-medium text-[var(--text-tertiary)] bg-[var(--bg-inset)] px-2 py-0.5 rounded-full border border-[var(--border-subtle)]">
            {t('anonymousHint')}
          </span>
        </div>

        {lockedConstraint ? (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <Check size={11} className="text-emerald-500" />
            <span className="tabular-nums">{t('maxBudgetLabel')} {formatRegionalMaxBudget(budgetLimit, locationContext)}</span>
          </span>
        ) : (
          <span className="text-[11px] text-[var(--text-tertiary)] truncate max-w-[180px]">
            {activeTier.desc}
          </span>
        )}
      </div>

      {/* 60fps GPU Sliding Segmented Track with Concentric Radii */}
      <SegmentedControl
        options={tiers.map((tier) => ({
          value: tier.id,
          label: tier.label,
        }))}
        value={activeTier.id}
        onChange={(tierId) => {
          const selected = tiers.find((t) => t.id === tierId);
          if (selected) {
            triggerHaptic('selection');
            onSelectTier?.(selected.limit, selected.isFiltered);
          }
        }}
        variant="accent"
        size="md"
      />
    </section>
  );
}
