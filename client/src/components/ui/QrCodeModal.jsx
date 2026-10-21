import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, Share2, Smartphone } from 'lucide-react';
import { useToast } from './Toast';
import { triggerHaptic } from '../../utils/haptics';
import useDrawerGesture from './useDrawerGesture';

export default function QrCodeModal({
  isOpen = false,
  onClose,
  pin,
  topic = 'Consensus Session',
}) {
  const [copied, setCopied] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const { addToast } = useToast();

  const handleClose = () => {
    if (isClosing) return;
    triggerHaptic('light');
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose?.();
    }, 180);
  };

  const { panelRef, backdropRef, grabberProps, containerProps } = useDrawerGesture({
    onClose: handleClose,
  });

  const inviteUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?pin=${pin}`
    : `https://noyoupick.org/?pin=${pin}`;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) handleClose();
    };
    if (isOpen) {
      triggerHaptic('tap');
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!isOpen && !isClosing) return null;

  const handleCopy = async () => {
    triggerHaptic('tap');
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      addToast({
        title: 'Invite Link Copied',
        message: 'Link with PIN ready to paste',
        type: 'success',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      addToast({
        title: 'Copy Failed',
        message: inviteUrl,
        type: 'warning',
      });
    }
  };

  const handleShare = async () => {
    triggerHaptic('tap');
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join Consensus Room #${pin}`,
          text: `Join our consensus session for "${topic}"!`,
          url: inviteUrl,
        });
      } catch {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  return createPortal(
    <div
      ref={backdropRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-modal-title"
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-xl bg-black/60 transition-opacity duration-200 ${
        isClosing ? 'animate-fade-out' : 'animate-fade-in'
      }`}
      onClick={handleClose}
    >
      <div
        ref={panelRef}
        {...containerProps}
        className={`relative w-full max-w-lg sm:max-w-sm rounded-t-[32px] sm:rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-main)] p-6 pt-1 shadow-2xl flex flex-col items-center gap-4 text-center select-none pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] sm:pb-6 ${
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

        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close QR Modal"
          className="absolute top-4 right-4 p-2 rounded-full text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-2xl bg-[var(--accent-bg)]/10 text-[var(--accent-bg)] flex items-center justify-center mb-1">
            <Smartphone size={20} />
          </div>
          <h2 id="qr-modal-title" className="text-lg font-bold text-[var(--text-primary)]">
            Scan to Join
          </h2>
          <p className="text-xs text-[var(--text-secondary)] line-clamp-1 max-w-[240px]">
            {topic}
          </p>
        </div>

        {/* QR Code Canvas Frame - optical phone scanner readability */}
        <div className="p-4 rounded-2xl bg-white shadow-inner border border-black/5 flex items-center justify-center">
          <QRCodeSVG
            value={inviteUrl}
            size={192}
            level="H"
            includeMargin={false}
            fgColor="#0f172a"
            bgColor="#ffffff"
          />
        </div>

        {/* Passkey Banner */}
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
            Room Passkey
          </span>
          <span className="text-3xl font-black tabular-nums tracking-widest text-[var(--text-primary)]">
            {pin}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 w-full pt-1">
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 py-2.5 px-3 rounded-xl bg-[var(--bg-inset)] hover:bg-black/10 dark:hover:bg-white/10 text-xs font-bold text-[var(--text-primary)] border border-[var(--border-subtle)] transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
          >
            {copied ? <Check size={14} className="text-[var(--status-success)]" /> : <Copy size={14} />}
            <span>{copied ? 'Copied' : 'Copy Link'}</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="py-2.5 px-4 rounded-xl bg-[var(--accent-bg)] hover:opacity-90 text-white text-xs font-bold transition-opacity flex items-center justify-center gap-1.5 shadow-sm cursor-pointer active:scale-[0.98]"
          >
            <Share2 size={14} />
            <span>Share</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
