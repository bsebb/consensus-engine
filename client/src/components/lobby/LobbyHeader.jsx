import React from 'react';
import { LogOut, Settings, Copy, Check, Share2 } from 'lucide-react';
import ThemeToggle from '../ThemeToggle';
import { useLanguage } from '../../context/LanguageContext';

export default function LobbyHeader({
  pin,
  copied,
  onLeave,
  onCopyPin,
  onShare,
  onOpenSettings,
}) {
  const { t } = useLanguage();

  return (
    <header className="sticky top-0 z-30 bg-[var(--bg-root)] border-b border-[var(--border-main)] px-4 safe-pt-header pb-3 shrink-0">
      <div className="relative flex items-center justify-between gap-2 max-w-md mx-auto min-h-[36px]">
        <div className="flex items-center z-10">
          <button
            type="button"
            onClick={onLeave}
            className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer py-1.5 px-3 rounded-full bg-[var(--bg-surface)] border border-[var(--border-main)] active:scale-[0.97] touch-manipulation"
            aria-label="Leave Room"
          >
            <LogOut size={13} />
            <span>{t('home')}</span>
          </button>
        </div>

        <div className="flex-1 min-w-0 flex items-center justify-center z-10 pointer-events-auto">
          <button
            type="button"
            onClick={onCopyPin}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border-main)] text-xs font-bold text-[var(--text-primary)] transition-all cursor-pointer active:scale-[0.97] touch-manipulation shadow-2xs"
            title={t('shareLink')}
            aria-label={t('shareLink')}
          >
            {copied ? (
              <>
                <Check size={12} className="text-emerald-500 animate-scale-up" />
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">{t('copied')}</span>
              </>
            ) : (
              <>
                <span className="hidden min-[380px]:inline text-[var(--text-tertiary)] font-normal">{t('code')}</span>
                <span className="text-[var(--accent-bg)] tabular-nums font-bold">#{pin}</span>
                <Copy size={11} className="text-[var(--text-tertiary)] ml-0.5" />
              </>
            )}
          </button>
        </div>

        <div className="flex items-center gap-0.5 z-10 shrink-0">
          {onShare && (
            <button
              type="button"
              onClick={onShare}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer active:scale-95 touch-manipulation"
              aria-label={t('inviteFriends')}
              title={t('inviteFriends')}
            >
              <Share2 size={15} />
            </button>
          )}
          <button
            type="button"
            onClick={onOpenSettings}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all cursor-pointer touch-manipulation"
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
