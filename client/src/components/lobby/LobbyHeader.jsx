import React from 'react';
import { LogOut, Settings, Copy, Check, SlidersHorizontal } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function LobbyHeader({
  pin,
  copied,
  onLeave,
  onCopyPin,
  onOpenSettings,
  onOpenRoomSettings,
  isHost = false,
}) {
  const { t } = useLanguage();

  return (
    <header className="sticky top-0 z-30 bg-[var(--bg-root)] border-b border-[var(--border-main)] px-3.5 sm:px-4 safe-pt-header pb-2 shrink-0">
      <div className="relative flex items-center justify-between max-w-md mx-auto min-h-[40px]">
        {/* Left Slot: Home Navigation Pill */}
        <div className="flex items-center justify-start z-10 shrink-0">
          <button
            type="button"
            onClick={onLeave}
            className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer py-1.5 px-3 rounded-full bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border-main)] active:scale-[0.97] touch-manipulation shadow-2xs"
            aria-label="Leave Room"
          >
            <LogOut size={13} />
            <span>{t('home')}</span>
          </button>
        </div>

        {/* Absolute Dead Center: Room Code Pill */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center z-10 pointer-events-auto">
          <button
            type="button"
            onClick={onCopyPin}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border-main)] text-xs font-bold text-[var(--text-primary)] transition-all cursor-pointer active:scale-[0.97] touch-manipulation shadow-2xs"
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
                <span className="text-[var(--text-tertiary)] font-normal">{t('code')}</span>
                <span className="text-[var(--accent-bg)] tabular-nums font-bold">#{pin}</span>
                <Copy size={11} className="text-[var(--text-tertiary)] ml-0.5" />
              </>
            )}
          </button>
        </div>

        {/* Right Slot: Balanced Action Buttons (Room Settings + Preferences) */}
        <div className="flex items-center justify-end gap-1.5 z-10 shrink-0">
          {onOpenRoomSettings && (
            <button
              type="button"
              onClick={onOpenRoomSettings}
              className="w-8.5 h-8.5 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border-main)] active:scale-95 transition-all cursor-pointer touch-manipulation shadow-2xs"
              aria-label={isHost ? 'Room Settings' : 'Room Rules'}
              title={isHost ? 'Room Settings' : 'Room Rules'}
            >
              <SlidersHorizontal size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={onOpenSettings}
            className="w-8.5 h-8.5 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border-main)] active:scale-95 transition-all cursor-pointer touch-manipulation shadow-2xs"
            aria-label="Open Settings"
            title="Preferences"
          >
            <Settings size={15} />
          </button>
        </div>
      </div>
    </header>
  );
}
