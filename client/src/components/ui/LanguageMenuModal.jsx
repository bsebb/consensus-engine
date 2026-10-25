import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Globe, X, Check } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { SUPPORTED_LANGUAGES } from '../../context/translations';
import { triggerHaptic } from '../../utils/haptics';
import useDrawerGesture from './useDrawerGesture';

export function LanguageGridPicker({ onSelectDone }) {
  const { lang, setLang } = useLanguage();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {SUPPORTED_LANGUAGES.map((item) => {
        const isSelected = lang === item.code;
        return (
          <button
            key={item.code}
            type="button"
            onClick={() => {
              triggerHaptic('selection');
              setLang(item.code);
              onSelectDone?.(item.code);
            }}
            aria-pressed={isSelected}
            className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-2xl border text-left transition-all cursor-pointer active:scale-[0.98] ${
              isSelected
                ? 'bg-[var(--accent-bg)]/12 border-[var(--accent-bg)] text-[var(--text-primary)] shadow-2xs'
                : 'bg-[var(--bg-inset)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-main)]'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`text-[10px] font-mono font-extrabold px-1.5 py-0.5 rounded-md shrink-0 ${
                  isSelected
                    ? 'bg-[var(--accent-bg)] text-white'
                    : 'bg-[var(--bg-elevated)] text-[var(--text-tertiary)] border border-[var(--border-subtle)]'
                }`}
              >
                {item.badge}
              </span>
              <span className="text-xs font-bold truncate">{item.nativeName}</span>
            </div>
            {isSelected && <Check size={14} className="text-[var(--accent-bg)] shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}

export default function LanguageMenuModal({ isOpen, onClose }) {
  const { lang, setLang, t } = useLanguage();
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose?.();
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

  return createPortal(
    <div
      ref={backdropRef}
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-xl bg-black/60 transition-opacity duration-200 ${
        isClosing ? 'animate-fade-out' : 'animate-fade-in'
      }`}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label={t('langTitle')}
    >
      <div
        ref={panelRef}
        {...containerProps}
        className={`w-full max-w-md bg-[var(--bg-elevated)] glass-surface rounded-t-[32px] sm:rounded-3xl p-5 pt-1 border border-[var(--border-glass)] shadow-[0_24px_64px_rgba(0,0,0,0.4)] flex flex-col gap-3 select-none text-[var(--text-primary)] pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] sm:pb-5 ${
          isClosing ? 'animate-sheet-down sm:animate-scale-down' : 'animate-sheet-up sm:animate-modal-spring'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag Handle Pill */}
        <div
          {...grabberProps}
          className="w-full pt-2 pb-0 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none shrink-0"
          aria-label="Drag down to dismiss"
        >
          <div className="w-10 h-1.2 rounded-full bg-[var(--text-tertiary)]/30 mx-auto my-2 mb-3 cursor-grab" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--accent-bg)]/10 text-[var(--accent-bg)] flex items-center justify-center">
              <Globe size={18} />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">{t('langTitle')}</h2>
              <p className="text-[11px] text-[var(--text-secondary)]">{t('langSubtitle')}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-[var(--bg-inset)] hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer min-h-[36px]"
            aria-label={t('close')}
          >
            <X size={16} />
          </button>
        </div>

        {/* Language List */}
        <div className="flex flex-col gap-2 py-1">
          {SUPPORTED_LANGUAGES.map((item) => {
            const isSelected = lang === item.code;
            return (
              <button
                key={item.code}
                type="button"
                onClick={() => {
                  triggerHaptic('selection');
                  setLang(item.code);
                  handleClose();
                }}
                aria-pressed={isSelected}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl border text-left transition-all cursor-pointer active:scale-[0.99] ${
                  isSelected
                    ? 'bg-[var(--accent-bg)]/12 border-[var(--accent-bg)] text-[var(--text-primary)] shadow-2xs'
                    : 'bg-[var(--bg-inset)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-main)]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`w-9 h-8 rounded-xl font-mono text-xs font-extrabold flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'bg-[var(--accent-bg)] text-white shadow-xs'
                        : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
                    }`}
                  >
                    {item.badge}
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-[var(--text-primary)] leading-tight">
                      {item.nativeName}
                    </span>
                    <span className="text-[11px] text-[var(--text-tertiary)] truncate">
                      {item.regionLabel}
                    </span>
                  </div>
                </div>

                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-[var(--accent-bg)] text-white'
                      : 'border border-[var(--border-main)] bg-transparent'
                  }`}
                >
                  {isSelected && <Check size={13} strokeWidth={3} />}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}
