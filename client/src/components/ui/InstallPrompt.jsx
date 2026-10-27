import React, { useState, useEffect } from 'react';
import { Share, PlusSquare, X, Download } from 'lucide-react';
import Button from './Button';
import { useLanguage } from '../../context/LanguageContext';

export default function InstallPrompt() {
  const { t } = useLanguage();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // 1. Check if already in standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    if (isStandalone) return;

    // 2. Never show during active voting or lobby to preserve focused mobile screen real estate
    const pathname = window.location.pathname || '';
    if (pathname.includes('/deck') || pathname.includes('/lobby')) {
      setShowPrompt(false);
      return;
    }

    // 3. Check dismissal cooldown (48h)
    const dismissedAt = localStorage.getItem('pwa_prompt_dismissed');
    if (dismissedAt) {
      const elapsed = Date.now() - Number(dismissedAt);
      if (elapsed < 48 * 60 * 60 * 1000) return;
    }

    // 4. Detect Apple Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    const isSafari = /safari/.test(userAgent) && !/chrome|crios|fxios/.test(userAgent);

    if (isAppleDevice && isSafari) {
      // Gentle delay so initial layout settles cleanly
      const timer = setTimeout(() => {
        setIsIOSDevice(true);
        setShowPrompt(true);
      }, 2500);
      return () => clearTimeout(timer);
    }

    // 5. Android / Chromium beforeinstallprompt handler
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa_prompt_dismissed', Date.now().toString());
  };

  const handleNativeInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  if (!showPrompt || window.location.pathname === '/dashboard') return null;

  return (
    <aside aria-label="Install App" className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-[1900] select-none">
      <div className="glass-surface rounded-2xl p-4 shadow-[0_12px_40px_rgba(0,0,0,0.22)] border border-[var(--border-glass)] flex flex-col gap-3 animate-sheet-up">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--accent-bg)] flex items-center justify-center text-white shadow-sm shrink-0">
              <Download size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[var(--text-primary)]">
                {t('installNoYouPick') || 'Install NoYouPick'}
              </h4>
              <p className="text-[11px] text-[var(--text-secondary)]">
                {t('installDesc') || 'Fast, tactile mobile voting app'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] rounded-lg transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        {isIOSDevice ? (
          <div className="text-xs text-[var(--text-secondary)] bg-[var(--bg-inset)] rounded-xl p-2.5 flex items-center gap-2 leading-snug">
            <span>Tap</span>
            <Share size={14} className="text-[var(--accent-bg)] shrink-0" />
            <span>then choose</span>
            <span className="font-bold text-[var(--text-primary)] inline-flex items-center gap-1">
              <PlusSquare size={13} /> {t('addToHomeScreen') || 'Add to Home Screen'}
            </span>
          </div>
        ) : (
          <Button
            size="sm"
            variant="primary"
            onClick={handleNativeInstall}
            className="w-full"
          >
            {t('addToDevice') || 'Add to Device'}
          </Button>
        )}
      </div>
    </aside>
  );
}
