import React from 'react';
import { Coins, ShieldCheck, Lock, Check } from 'lucide-react';
import RangeSlider from '../ui/RangeSlider';
import Button from '../ui/Button';

export default function StepZeroVault({
  lockedConstraint,
  budgetLimit,
  setBudgetLimit,
  handleLockBudget,
  handleUnlockBudget,
  lockingBudget,
  hasPendingBudgetChange,
  setHasPendingBudgetChange,
}) {
  return (
    <section className="p-5 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-main)] flex flex-col gap-3.5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Coins size={16} className="text-amber-500" />
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            Spending Comfort
          </h3>
        </div>
        {lockedConstraint ? (
          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-500 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-full">
            <Lock size={12} className="text-emerald-500" />
            <span>Comfort Set</span>
          </span>
        ) : (
          <span className="text-xs font-medium text-[var(--text-tertiary)]">
            Private & Optional
          </span>
        )}
      </div>

      {/* Clear Privacy Explanation */}
      <div className="p-3 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] leading-relaxed">
        <span className="font-semibold text-[var(--text-primary)]">No awkward bill split:</span> Set your comfortable ceiling. Venues above anyone's limit are quietly filtered out without revealing anyone's number.
      </div>

      <RangeSlider
        min={100}
        max={600}
        step={25}
        value={budgetLimit}
        onChange={(val) => {
          setBudgetLimit(val);
          if (lockedConstraint) setHasPendingBudgetChange(true);
        }}
        label="Maximum per Person"
        valueDisplay={`${budgetLimit} MDL`}
      />

      {!lockedConstraint ? (
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={handleLockBudget}
          loading={lockingBudget}
          icon={Check}
          className="mt-1 shadow-sm rounded-full"
        >
          Set My Comfort Limit
        </Button>
      ) : (
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <div className="flex items-center gap-2 min-w-0">
              <Check size={15} className="shrink-0 text-emerald-500" />
              <span className="truncate">Capped at {budgetLimit} MDL / person</span>
            </div>
            <button
              type="button"
              onClick={handleUnlockBudget}
              className="text-xs font-bold text-[var(--accent-bg)] hover:underline cursor-pointer ml-2 shrink-0 py-1 px-2 rounded-full hover:bg-[var(--accent-bg)]/10"
            >
              Adjust
            </button>
          </div>

          {hasPendingBudgetChange && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleLockBudget}
              loading={lockingBudget}
              icon={Check}
              className="shadow-sm rounded-full animate-[fadeIn_0.2s_var(--spring-smooth)]"
            >
              Update to {budgetLimit} MDL
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
