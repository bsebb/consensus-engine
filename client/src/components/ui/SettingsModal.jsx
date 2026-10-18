import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  User,
  Sliders,
  Moon,
  Sun,
  Laptop,
  Trash2,
  RotateCcw,
  Activity,
  Globe,
  Palette,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useSocket } from '../../context/SocketContext';
import { useToast } from './Toast';
import SpringToggle from './SpringToggle';
import { triggerHaptic } from '../../utils/haptics';

export default function SettingsModal({ isOpen, onClose }) {
  const { theme, setTheme, accent, setAccent, ACCENTS } = useTheme();
  const { lang, setLang, t } = useLanguage();
  const { addToast } = useToast();

  const [userName, setUserName] = useState(() => {
    return localStorage.getItem('consensus_user_name') || 'Guest';
  });

  const [haptics, setHaptics] = useState(() => {
    return localStorage.getItem('consensus_haptics_enabled') !== 'false';
  });

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleNameSave = (e) => {
    const val = e.target.value;
    setUserName(val);
    localStorage.setItem('consensus_user_name', val.trim() || 'Guest');
  };

  const handleToggleHaptics = (val) => {
    setHaptics(val);
    localStorage.setItem('consensus_haptics_enabled', String(val));
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

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 pt-[max(1rem,env(safe-area-inset-top,0px))] pb-[max(1rem,env(safe-area-inset-bottom,0px))] bg-black/60 backdrop-blur-md animate-[fadeBackdrop_0.2s_ease-out]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Application Settings"
    >
      <div
        className="w-full max-w-md max-h-[85vh] overflow-y-auto glass-surface rounded-3xl p-5 border border-[var(--border-glass)] shadow-[0_24px_64px_rgba(0,0,0,0.4)] flex flex-col gap-4 animate-[modalSpring_0.25s_var(--spring-smooth)] select-none text-[var(--text-primary)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
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
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[var(--bg-inset)] hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer min-h-[36px]"
            aria-label="Close Settings"
          >
            <X size={16} />
          </button>
        </div>

        {/* Section 1: Language Picker */}
        <section className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] flex items-center gap-1.5">
            <Globe size={12} />
            <span>{t('langTitle')}</span>
          </span>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'en', flag: '🇺🇸', label: 'English' },
              { id: 'ro', flag: '🇲🇩', label: 'Română' },
              { id: 'ru', flag: '🇷🇺', label: 'Русский' },
            ].map((item) => {
              const isSelected = lang === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setLang(item.id);
                    triggerHaptic('tap');
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--accent-bg)] text-white border-[var(--accent-bg)] shadow-[0_2px_8px_var(--accent-glow)]'
                      : 'bg-[var(--bg-inset)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--text-tertiary)]'
                  }`}
                >
                  <span>{item.flag}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Section 2: Accent Theme Color */}
        <section className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] flex items-center gap-1.5">
            <Palette size={12} />
            <span>{t('colorTitle')}</span>
          </span>
          <div className="grid grid-cols-5 gap-2">
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
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--bg-surface)] border-[var(--accent-bg)] shadow-[0_2px_10px_var(--accent-glow)]'
                      : 'bg-[var(--bg-inset)] border-[var(--border-subtle)] hover:border-[var(--text-tertiary)]'
                  }`}
                  title={item.name}
                >
                  <span
                    className="w-5 h-5 rounded-full shadow-xs flex items-center justify-center text-white"
                    style={{ backgroundColor: item.color }}
                  >
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </span>
                  <span className="text-[10px] font-semibold text-[var(--text-secondary)] truncate w-full text-center">
                    {item.name.split(' ')[0]}
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
              placeholder="Your Name (e.g. Alex)"
              className="flex-1 px-3 py-2 text-xs font-semibold bg-transparent outline-none text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
            />
            <span className="text-[10px] font-mono font-bold px-2 py-1 bg-[var(--bg-elevated)] rounded-xl text-[var(--text-secondary)]">
              Saved
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

        {/* Section 5: Theme Appearance */}
        <section className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-[var(--text-secondary)]">
            {t('themeTitle')}
          </span>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'dark', label: t('themeDark'), icon: Moon },
              { id: 'light', label: t('themeLight'), icon: Sun },
              { id: 'system', label: t('themeSystem'), icon: Laptop },
            ].map((item) => {
              const isCurrent = theme === item.id;
              const IconComp = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTheme(item.id)}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-[var(--accent-bg)] text-white border-[var(--accent-bg)] shadow-[0_2px_8px_var(--accent-glow)]'
                      : 'bg-[var(--bg-inset)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--text-tertiary)]'
                  }`}
                >
                  <IconComp size={13} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Section 6: Data Reset Actions */}
        <div className="pt-2 flex items-center gap-2 border-t border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={handleClearHistory}
            className="flex-1 py-2 px-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-[11px] font-bold border border-rose-500/20 flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[36px]"
          >
            <Trash2 size={12} />
            <span>{t('clearHistoryBtn')}</span>
          </button>
          <button
            type="button"
            onClick={handleResetActiveRoom}
            className="flex-1 py-2 px-2 rounded-xl bg-[var(--bg-inset)] hover:bg-black/10 dark:hover:bg-white/10 text-[var(--text-secondary)] text-[11px] font-bold border border-[var(--border-subtle)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[36px]"
          >
            <RotateCcw size={12} />
            <span>Reset Active PIN</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
