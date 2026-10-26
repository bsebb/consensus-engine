import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  SlidersHorizontal,
  Users,
  Layers,
  Coins,
  MapPin,
  Check,
} from 'lucide-react';
import Button from '../ui/Button';
import SegmentedControl from '../ui/SegmentedControl';
import { triggerHaptic } from '../../utils/haptics';
import useDrawerGesture from '../ui/useDrawerGesture';

export default function RoomSettingsModal({
  isOpen,
  onClose,
  isHost,
  mode = 'DISCOVERY',
  groupSize = 4,
  deckSize = 12,
  budgetLimit = 600,
  lockedConstraint = false,
  radiusKm = 5,
  onApplySettings,
}) {
  const [isClosing, setIsClosing] = useState(false);

  // Draft local states
  const [draftGroupSize, setDraftGroupSize] = useState(groupSize);
  const [draftDeckSize, setDraftDeckSize] = useState(deckSize);
  const [draftBudgetLimit, setDraftBudgetLimit] = useState(budgetLimit);
  const [draftLockedConstraint, setDraftLockedConstraint] = useState(lockedConstraint);
  const [draftRadiusKm, setDraftRadiusKm] = useState(radiusKm);

  // Sync draft state with props when opened
  useEffect(() => {
    if (isOpen) {
      setDraftGroupSize(groupSize);
      setDraftDeckSize(deckSize);
      setDraftBudgetLimit(budgetLimit);
      setDraftLockedConstraint(lockedConstraint);
      setDraftRadiusKm(radiusKm);
    }
  }, [isOpen, groupSize, deckSize, budgetLimit, lockedConstraint, radiusKm]);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 180);
  };

  const { panelRef, backdropRef, grabberProps, containerProps } = useDrawerGesture({
    onClose,
    isOpen,
    isClosing,
  });

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!isOpen && !isClosing) return null;

  const handleApply = () => {
    triggerHaptic('like');
    onApplySettings?.({
      groupSize: draftGroupSize,
      deckSize: Math.min(12, Math.max(2, draftDeckSize)),
      budgetLimit: draftBudgetLimit,
      lockedConstraint: draftLockedConstraint,
      radiusKm: draftRadiusKm,
    });
    handleClose();
  };

  const budgetTiers = [
    { id: 'all', label: 'All', limit: 600, filtered: false },
    { id: '1', label: '$', limit: 150, filtered: true },
    { id: '2', label: '$$', limit: 300, filtered: true },
    { id: '3', label: '$$$', limit: 450, filtered: true },
  ];

  const activeBudgetTierId = !draftLockedConstraint
    ? 'all'
    : draftBudgetLimit <= 180
    ? '1'
    : draftBudgetLimit <= 350
    ? '2'
    : '3';

  const modalContent = (
    <div
      ref={backdropRef}
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs transition-opacity duration-200 ${
        isClosing ? 'opacity-0' : 'opacity-100'
      }`}
      {...containerProps}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="room-settings-title"
        className={`w-full sm:max-w-md bg-[var(--bg-root)] border-t sm:border border-[var(--border-main)] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] transition-transform duration-200 ease-out ${
          isClosing ? 'translate-y-full sm:translate-y-4' : 'translate-y-0'
        }`}
      >
        {/* Grabber for bottom sheet on touch screens */}
        <div {...grabberProps} className="w-full pt-3 pb-1 flex justify-center cursor-grab active:cursor-grabbing sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-[var(--border-main)] opacity-70" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-subtle)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[var(--accent-bg)]/12 text-[var(--accent-bg)] flex items-center justify-center">
              <SlidersHorizontal size={17} />
            </div>
            <div>
              <h2 id="room-settings-title" className="text-base font-black text-[var(--text-primary)] tracking-tight">
                {isHost ? 'Room Settings' : 'Room Rules'}
              </h2>
              <p className="text-[11px] text-[var(--text-tertiary)]">
                {isHost ? 'Fine-tune quorum, deck length, and filters' : 'Preferences set for this session'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={17} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex flex-col gap-4 overflow-y-auto overscroll-contain">
          {/* 1. Target Headcount */}
          <div className="flex flex-col gap-2 p-3.5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                <Users size={14} className="text-[var(--accent-bg)]" />
                <span>Expected Group Size</span>
              </span>
              <span className="text-xs font-extrabold text-[var(--accent-bg)] tabular-nums px-2 py-0.5 rounded-full bg-[var(--accent-bg)]/10">
                {draftGroupSize} people
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Voting can start once at least 2 people join. This lets everyone know how many to wait for.
            </p>
            {isHost && (
              <SegmentedControl
                options={[
                  { value: '2', label: '2' },
                  { value: '3', label: '3' },
                  { value: '4', label: '4' },
                  { value: '5', label: '5' },
                  { value: '6', label: '6' },
                  { value: '8', label: '8+' },
                ]}
                value={String(draftGroupSize)}
                onChange={(val) => {
                  triggerHaptic('tap');
                  setDraftGroupSize(Number(val));
                }}
                size="sm"
              />
            )}
          </div>

          {/* 2. Swiping Deck Size */}
          <div className="flex flex-col gap-2 p-3.5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                <Layers size={14} className="text-[var(--accent-bg)]" />
                <span>Max Swiping Deck Size</span>
              </span>
              <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums px-2 py-0.5 rounded-full bg-emerald-500/10">
                {draftDeckSize} cards
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Capped at 12 cards to keep voting fast and prevent swipe fatigue.
            </p>
            {isHost && (
              <SegmentedControl
                options={[
                  { value: '6', label: '6 cards' },
                  { value: '8', label: '8 cards' },
                  { value: '10', label: '10 cards' },
                  { value: '12', label: '12 cards' },
                ]}
                value={String(draftDeckSize)}
                onChange={(val) => {
                  triggerHaptic('tap');
                  setDraftDeckSize(Number(val));
                }}
                size="sm"
              />
            )}
          </div>

          {/* 3. Budget Ceiling (Discovery mode only) */}
          {mode !== 'CUSTOM' && (
            <div className="flex flex-col gap-2 p-3.5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Coins size={14} className="text-[var(--accent-bg)]" />
                  <span>Host Budget Ceiling</span>
                </span>
                <span className="text-xs font-extrabold text-[var(--text-secondary)] tabular-nums px-2 py-0.5 rounded-full bg-[var(--bg-inset)]">
                  {draftLockedConstraint ? `${activeBudgetTierId === '1' ? '$' : activeBudgetTierId === '2' ? '$$' : '$$$'}` : 'No cap'}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Upper bound for venues shown. Group members can also anonymously vote with a lower budget.
              </p>
              {isHost && (
                <SegmentedControl
                  options={budgetTiers.map((t) => ({ value: t.id, label: t.label }))}
                  value={activeBudgetTierId}
                  onChange={(tierId) => {
                    triggerHaptic('tap');
                    const tier = budgetTiers.find((t) => t.id === tierId);
                    if (tier) {
                      setDraftLockedConstraint(tier.filtered);
                      setDraftBudgetLimit(tier.limit);
                    }
                  }}
                  size="sm"
                />
              )}
            </div>
          )}

          {/* 4. Radius Preset (Discovery mode only) */}
          {mode !== 'CUSTOM' && (
            <div className="flex flex-col gap-2 p-3.5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <MapPin size={14} className="text-[var(--accent-bg)]" />
                  <span>Search Radius</span>
                </span>
                <span className="text-xs font-extrabold text-[var(--text-primary)] tabular-nums px-2 py-0.5 rounded-full bg-[var(--bg-inset)]">
                  {draftRadiusKm} km
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Search distance around your group&apos;s current area.
              </p>
              {isHost && (
                <SegmentedControl
                  options={[
                    { value: '1', label: '1 km' },
                    { value: '3', label: '3 km' },
                    { value: '5', label: '5 km' },
                    { value: '10', label: '10 km' },
                  ]}
                  value={String(draftRadiusKm)}
                  onChange={(val) => {
                    triggerHaptic('tap');
                    setDraftRadiusKm(Number(val));
                  }}
                  size="sm"
                />
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2.5 shrink-0 bg-[var(--bg-elevated)]">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="rounded-xl px-4"
          >
            {isHost ? 'Cancel' : 'Close'}
          </Button>
          {isHost && (
            <Button
              variant="primary"
              size="sm"
              icon={Check}
              onClick={handleApply}
              className="rounded-xl px-5"
            >
              Apply Settings
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : null;
}
