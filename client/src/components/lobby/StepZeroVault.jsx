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
    <section className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-main)] flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Coins size={16} className="text-[var(--status-warning)]" />
          <span className="text-xs font-bold text-[var(--text-primary)]">
            Step Zero Privacy Shield
          </span>
        </div>
        {lockedConstraint ? (
          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-full shadow-[0_0_16px_rgba(16,185,129,0.35)] animate-[stampPop_0.3s_var(--spring-bounce)]">
            <Lock size={12} className="text-emerald-400" />
            <span>Vault Sealed</span>
          </span>
        ) : (
          <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-tertiary)]">
            Anonymous Vault
          </span>
        )}
      </div>

      {/* Clear Privacy Shield Explanation */}
      <div className="p-3 rounded-xl bg-[var(--bg-inset)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] leading-relaxed">
        <strong className="text-[var(--text-primary)]">Anonymous Privacy Vault:</strong> Venues exceeding any peer ceiling are pruned before voting opens. No participant ever sees your personal spending boundary.
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
        label="Personal Max per Person"
        valueDisplay={`${budgetLimit} MDL`}
      />

      {!lockedConstraint ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleLockBudget}
          loading={lockingBudget}
          icon={ShieldCheck}
          className="mt-1 shadow-sm"
        >
          Seal Budget Anonymously
        </Button>
      ) : (
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-500 font-semibold">
            <div className="flex items-center gap-2 min-w-0">
              <Check size={14} className="shrink-0" />
              <span className="truncate">Ceiling locked at {budgetLimit} MDL</span>
            </div>
            <button
              type="button"
              onClick={handleUnlockBudget}
              className="text-[11px] font-bold text-[var(--accent-bg)] hover:underline cursor-pointer ml-2 shrink-0 py-1 px-1.5 rounded hover:bg-[var(--accent-bg)]/10"
            >
              Unlock & Adjust
            </button>
          </div>

          {hasPendingBudgetChange && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleLockBudget}
              loading={lockingBudget}
              icon={ShieldCheck}
              className="shadow-sm animate-[fadeIn_0.2s_var(--spring-smooth)]"
            >
              Update Ceiling to {budgetLimit} MDL
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
