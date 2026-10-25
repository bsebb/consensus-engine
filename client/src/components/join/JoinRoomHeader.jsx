import React from 'react';
import { Globe, History, Settings } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import BrandLogo from '../ui/BrandLogo';
import ThemeToggle from '../ThemeToggle';

export default function JoinRoomHeader({
  onOpenLanguage,
  onOpenHistory,
  onOpenSettings,
}) {
  const { lang, t } = useLanguage();

  return (
    <header className="w-full flex items-center justify-between pb-1.5 max-w-md mx-auto shrink-0">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0F1422] to-[#05070B] border border-white/10 flex items-center justify-center shadow-xs overflow-hidden p-0.5">
          <BrandLogo size={22} />
        </div>
        <div className="flex flex-col">
          <span className="font-extrabold text-base tracking-tight text-[var(--text-primary)] leading-tight">
            NoYouPick
          </span>
          <span className="text-[10px] font-medium text-[var(--text-tertiary)] -mt-0.5">
            {t('tagline')}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onOpenLanguage}
          aria-label={t('langTitle')}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-surface)] border border-[var(--border-main)] transition-colors cursor-pointer"
          title={t('langTitle')}
        >
          <Globe size={12} className="text-[var(--accent-bg)]" />
          <span className="font-bold uppercase">{lang}</span>
        </button>
        <button
          type="button"
          onClick={onOpenHistory}
          className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all cursor-pointer touch-manipulation"
          aria-label={t('history')}
          title={t('history')}
        >
          <History size={16} />
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all cursor-pointer touch-manipulation"
          aria-label={t('settings')}
          title={t('settings')}
        >
          <Settings size={16} />
        </button>
        <ThemeToggle />
      </div>
    </header>
  );
}
