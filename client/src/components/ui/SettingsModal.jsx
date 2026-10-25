import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Sliders,
  Moon,
  Sun,
  Laptop,
  Trash2,
  RotateCcw,
  Globe,
  Palette,
  Check,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from './Toast';
import SpringToggle from './SpringToggle';
import { triggerHaptic, updateIosHapticsState } from '../../utils/haptics';
import SegmentedControl from './SegmentedControl';
import { LanguageGridPicker } from './LanguageMenuModal';
import useDrawerGesture from './useDrawerGesture';

export default function SettingsModal({ isOpen, onClose }) {
  const { theme, setTheme, accent, setAccent, ACCENTS } = useTheme();
  const { lang, setLang, t } = useLanguage();
  const { addToast } = useToast();
  const [isClosing, setIsClosing] = useState(false);

  const [userName, setUserName] = useState(() => {
    return localStorage.getItem('consensus_nickname') || localStorage.getItem('consensus_user_name') || 'Guest';
  });

  const [haptics, setHaptics] = useState(() => {
    return localStorage.getItem('consensus_haptics_enabled') !== 'false';
  });

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

  const handleNameSave = (e) => {
    const val = e.target.value;
    setUserName(val);
    const clean = val.trim() || 'Guest';
    localStorage.setItem('consensus_nickname', clean);
    localStorage.setItem('consensus_user_name', clean);
  };

  const handleToggleHaptics = (val) => {
    setHaptics(val);
    localStorage.setItem('consensus_haptics_enabled', String(val));
    updateIosHapticsState();
    window.dispatchEvent(new CustomEvent('consensus_haptics_change', { detail: { enabled: val } }));
    if (val) triggerHaptic('tap');
    addToast({
      title: 'Haptics Updated',
      message: val ? 'Tactile feedback enabled' : 'Tactile feedback muted',
      type: 'info',
    });
  };

  const handleClearHistory = () => {
    localStorage.removeItem('consensus_history');
    addToast({
      title: 'History Cleared',
      message: t('clearHistoryMsg'),
      type: 'info',
    });
  };

  const handleResetActiveRoom = () => {
    localStorage.removeItem('consensus_active_pin');
    sessionStorage.removeItem('consensus_active_pin');
    addToast({
      title: 'Active Room Cleared',
      message: 'Detached from current session',
      type: 'info',
    });
  };

  if (!isOpen && !isClosing) return null;

  return createPortal(
    <div
      ref={backdropRef}
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-xl bg-black/60 transition-opacity duration-200 ${
        isClosing ? 'animate-fade-out' : 'animate-fade-in'
      }`}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Application Settings"
    >
      <div
        ref={panelRef}
        {...containerProps}
        className={`w-full max-w-lg sm:max-w-md max-h-[88dvh] sm:max-h-[85vh] bg-[var(--bg-elevated)] glass-surface rounded-t-[32px] sm:rounded-3xl p-5 pt-1 border border-[var(--border-glass)] shadow-[0_24px_64px_rgba(0,0,0,0.4)] flex flex-col gap-3 select-none text-[var(--text-primary)] pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] sm:pb-5 ${
          isClosing ? 'animate-sheet-down sm:animate-scale-down' : 'animate-sheet-up sm:animate-modal-spring'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Apple Pro-Grade Drag Handle Pill */}
        <div
          {...grabberProps}
          className="w-full pt-2 pb-0 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none shrink-0"
          aria-label="Drag down to dismiss"
        >
          <div className="w-10 h-1.2 rounded-full bg-[var(--text-tertiary)]/30 mx-auto my-2 mb-3 cursor-grab" />
        </div>

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--accent-bg)]/10 text-[var(--accent-bg)] flex items-center justify-center">
              <Sliders size={18} />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">{t('prefTitle')}</h2>
              <p className="text-[11px] text-[var(--text-secondary)]">{t('prefSubtitle')}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-[var(--bg-inset)] hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer min-h-[36px]"
            aria-label="Close Settings"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto pr-0.5 flex flex-col gap-4 touch-pan-y overscroll-contain">
          {/* Section 1: Language Picker (6 Spoken Languages) */}
          <section className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] flex items-center gap-1.5">
              <Globe size={12} />
              <span>{t('langTitle')}</span>
            </span>
            <LanguageGridPicker />
          </section>

          {/* Section 2: Accent Theme Color */}
          <section className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] flex items-center gap-1.5">
              <Palette size={12} />
              <span>{t('colorTitle')}</span>
            </span>
            <div className="flex items-center justify-between px-3 py-2.5 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)]">
              {ACCENTS.map((item) => {
                const isSelected = accent === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setAccent(item.id);
                      triggerHaptic('tap');
                    }}
                    className="p-1.5 rounded-full cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-bg)] transition-transform active:scale-95"
                    aria-label={item.name}
                    aria-pressed={isSelected}
                    title={item.name}
                  >
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${
                        isSelected
                          ? 'ring-2 ring-[var(--accent-bg)] ring-offset-2 ring-offset-[var(--bg-inset)] scale-105 shadow-xs'
                          : 'opacity-85 hover:opacity-100 hover:scale-105'
                      }`}
                      style={{ backgroundColor: item.color }}
                    >
                      {isSelected && (
                        <Check size={12} strokeWidth={3} className="text-white drop-shadow-xs" />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Section 3: User Profile */}
          <section className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              {t('voterIdentity')}
            </span>
            <div className="flex items-center gap-2 bg-[var(--bg-inset)] p-1.5 rounded-2xl border border-[var(--border-subtle)]">
              <input
                type="text"
                value={userName}
                onChange={handleNameSave}
                placeholder={t('namePlaceholder') || 'Your Name (e.g. Alex)'}
                className="flex-1 px-3 py-2 text-xs font-semibold bg-transparent outline-none text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
              />
              <span className="text-[10px] font-sans font-bold px-2 py-1 bg-[var(--bg-elevated)] rounded-xl text-[var(--text-secondary)]">
                {t('savedBadge') || 'Saved'}
              </span>
            </div>
          </section>

          {/* Section 4: Motion & Interaction */}
          <section className="flex flex-col gap-2">
            <div className="p-3 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)] flex flex-col gap-2">
              <SpringToggle
                label={t('hapticsTitle')}
                description={t('hapticsDesc')}
                checked={haptics}
                onChange={handleToggleHaptics}
              />
            </div>
          </section>

          {/* Section 5: Display Appearance Segmented Menu */}
          <section className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] flex items-center gap-1.5">
              <Sun size={12} />
              <span>{t('themeTitle')}</span>
            </span>
            <SegmentedControl
              options={[
                { value: 'dark', label: t('themeDark') || 'Dark', icon: Moon },
                { value: 'light', label: t('themeLight') || 'Light', icon: Sun },
                { value: 'system', label: t('themeSystem') || 'System', icon: Laptop },
              ]}
              value={theme}
              onChange={setTheme}
              size="sm"
            />
          </section>

          {/* Section 6: Data Reset Actions */}
          <div className="pt-2 flex items-center gap-2 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={handleClearHistory}
              className="flex-1 py-2 px-2.5 rounded-xl bg-[var(--bg-inset)] hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-secondary)] hover:text-red-500 dark:hover:text-red-400 text-[11px] font-medium border border-[var(--border-subtle)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[36px]"
            >
              <Trash2 size={13} className="opacity-70" />
              <span>{t('clearHistoryBtn')}</span>
            </button>
            <button
              type="button"
              onClick={handleResetActiveRoom}
              className="flex-1 py-2 px-2.5 rounded-xl bg-[var(--bg-inset)] hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-[11px] font-medium border border-[var(--border-subtle)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[36px]"
            >
              <RotateCcw size={13} className="opacity-70" />
              <span>{t('resetPinBtn') || 'Reset Active PIN'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
