import React from 'react';
import { Coins, Check, Lock } from 'lucide-react';
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
    {
      id: 'all',
      symbol: t('budgetAll') || 'All',
      limit: 600,
      isFiltered: false,
      desc: t('budgetDescAll') || 'All price ranges included - no budget cap',
    },
    {
      id: '1',
      symbol: '$',
      limit: 150,
      isFiltered: true,
      desc: `${t('budgetDesc1') || 'Budget-friendly spots'} (${profile.tiers[1].short})`,
    },
    {
      id: '2',
      symbol: '$$',
      limit: 300,
      isFiltered: true,
      desc: `${t('budgetDesc2') || 'Casual & comfortable dining'} (${profile.tiers[2].short})`,
    },
    {
      id: '3',
      symbol: '$$$',
      limit: 450,
      isFiltered: true,
      desc: `${t('budgetDesc3') || 'Upscale & fine dining'} (${profile.tiers[3].short})`,
    },
  ];

  const activeTier = tiers[activeTierIndex] || tiers[0];

  return (
    <section className="shrink-0 p-3.5 sm:p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-main)] flex flex-col gap-2.5 shadow-2xs">
      {/* Clean, Friendly Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Coins size={15} className="text-[var(--accent-bg)] shrink-0" />
          <h3 className="text-xs font-bold text-[var(--text-primary)] tracking-tight">
            {t('priceFilter') || 'Price Range'}
          </h3>
        </div>

        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--text-tertiary)] bg-[var(--bg-inset)] px-2.5 py-0.5 rounded-xl border border-[var(--border-subtle)] shrink-0">
          <Lock size={10} className="text-[var(--text-tertiary)] shrink-0" />
          <span>{t('anonymousHint') || 'Anonymous'}</span>
        </span>
      </div>

      {/* Segmented Selector with Concentric Rounded Corners (Exact same component and style as Settings tab) */}
      <SegmentedControl
        options={tiers.map((tier) => ({
          value: tier.id,
          label: tier.symbol,
        }))}
        value={activeTier.id}
        onChange={(tierId) => {
          const selected = tiers.find((t) => t.id === tierId);
          if (selected) {
            triggerHaptic('selection');
            onSelectTier?.(selected.limit, selected.isFiltered);
          }
        }}
        size="sm"
      />

      {/* Dynamic Subtitle - Full Width, Clear Local Threshold */}
      <div className="text-xs text-[var(--text-secondary)] leading-normal px-0.5">
        {lockedConstraint ? (
          <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
            <Check size={12} className="shrink-0" />
            <span className="tabular-nums">
              {t('maxBudgetLabel') || 'Capped at'} {formatRegionalMaxBudget(budgetLimit, locationContext)} • {t('anonymousHint') || 'Secret filter'}
            </span>
          </span>
        ) : (
          <span>{activeTier.desc}</span>
        )}
      </div>
    </section>
  );
}
