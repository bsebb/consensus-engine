import React from 'react';
import { LogOut, Settings, Copy, Check } from 'lucide-react';
import ThemeToggle from '../ThemeToggle';
import { useLanguage } from '../../context/LanguageContext';

export default function LobbyHeader({
  pin,
  copied,
  onLeave,
  onCopyPin,
  onOpenSettings,
}) {
  const { t } = useLanguage();

  return (
    <header className="sticky top-0 z-30 bg-[var(--bg-root)] border-b border-[var(--border-main)] px-4 safe-pt-header pb-3">
      <div className="flex items-center justify-between max-w-md mx-auto">
        <button
          type="button"
          onClick={onLeave}
          className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer py-1.5 px-3 rounded-full bg-[var(--bg-surface)] border border-[var(--border-main)] active:scale-[0.97]"
          aria-label="Leave Room"
        >
          <LogOut size={13} />
          <span>{t('home')}</span>
        </button>

        <button
          type="button"
          onClick={onCopyPin}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border-main)] text-xs font-bold text-[var(--text-primary)] transition-all cursor-pointer active:scale-[0.97]"
          title={t('shareLink')}
          aria-label={t('shareLink')}
        >
          {copied ? (
            <>
              <Check size={12} className="text-emerald-500" />
              <span className="text-emerald-600 dark:text-emerald-400">{t('copied')}</span>
            </>
          ) : (
            <>
              <span className="text-[var(--text-tertiary)] font-normal">{t('code')}</span>
              <span className="text-[var(--accent-bg)] tabular-nums">{pin}</span>
              <Copy size={11} className="text-[var(--text-tertiary)] ml-0.5" />
            </>
          )}
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenSettings}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Open Settings"
            title="Preferences"
          >
            <Settings size={16} />
          </button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
