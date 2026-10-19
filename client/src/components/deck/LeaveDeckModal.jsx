import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, LogOut, X, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { triggerHaptic } from '../../utils/haptics';

export default function LeaveDeckModal({
  isOpen,
  onClose,
  onReturnToLobby,
  onLeaveRoom,
}) {
  const { t } = useLanguage();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleReturn = () => {
    triggerHaptic('tap');
    onReturnToLobby();
  };

  const handleLeave = () => {
    triggerHaptic('warning');
    onLeaveRoom();
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="leave-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-[var(--bg-elevated)] border border-[var(--border-main)] rounded-3xl p-5 shadow-2xl flex flex-col gap-4 animate-[modalSpring_0.25s_var(--spring-smooth)] select-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
              <AlertCircle size={20} />
            </div>
            <div className="flex flex-col">
              <h3 id="leave-modal-title" className="text-base font-bold text-[var(--text-primary)]">
                {t('leaveSessionTitle')}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                {t('leaveSessionDesc')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleReturn}
            className="w-full p-3.5 rounded-2xl bg-[var(--bg-inset)] hover:bg-black/5 dark:hover:bg-white/5 border border-[var(--border-subtle)] text-left flex items-center gap-3 transition-all cursor-pointer active:scale-[0.98]"
          >
            <div className="w-9 h-9 rounded-xl bg-[var(--accent-bg)]/10 text-[var(--accent-bg)] flex items-center justify-center shrink-0">
              <ArrowLeft size={18} />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-xs font-bold text-[var(--text-primary)]">
                {t('returnToLobby')}
              </span>
              <span className="text-[11px] text-[var(--text-tertiary)] truncate">
                {t('returnToLobbyDesc')}
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={handleLeave}
            className="w-full p-3.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 text-left flex items-center gap-3 transition-all cursor-pointer active:scale-[0.98]"
          >
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-500 flex items-center justify-center shrink-0">
              <LogOut size={18} />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                {t('leaveRoomAction')}
              </span>
              <span className="text-[11px] text-rose-600/70 dark:text-rose-400/70 truncate">
                {t('leaveRoomDesc')}
              </span>
            </div>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer text-center"
        >
          {t('keepSwiping')}
        </button>
      </div>
    </div>,
    document.body
  );
}
