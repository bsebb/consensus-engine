import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ListPlus, X, Plus, Trash2, Sparkles, Check, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../ui/Toast';
import { triggerHaptic } from '../../utils/haptics';
import useDrawerGesture from '../ui/useDrawerGesture';
import Button from '../ui/Button';
import { getStarterPacks, getSuggestedTopics } from './customPollPacks';

export default function CustomPollDrawer({
  isOpen = false,
  onClose,
  topic = '',
  setTopic,
  customOptions = [],
  setCustomOptions,
}) {
  const { lang, t } = useLanguage();
  const { addToast } = useToast();
  const [newOptionText, setNewOptionText] = useState('');
  const [isClosing, setIsClosing] = useState(false);

  const questionInputRef = useRef(null);
  const optionInputRef = useRef(null);

  const handleClose = useCallback(() => {
    if (isClosing) return;
    triggerHaptic('light');
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose?.();
    }, 180);
  }, [isClosing, onClose]);

  const { panelRef, backdropRef, grabberProps, containerProps } = useDrawerGesture({ onClose: handleClose });

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const timer = setTimeout(() => {
        questionInputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  const starterPacks = useMemo(() => getStarterPacks(lang), [lang]);
  const suggestedTopics = useMemo(() => getSuggestedTopics(lang), [lang]);

  const contextualIdeas = useMemo(() => {
    const activePack = starterPacks.find((p) => p.options.some((o) => customOptions.includes(o))) || starterPacks[0];
    return activePack.options.filter(
      (opt) => !customOptions.some((existing) => existing.toLowerCase() === opt.toLowerCase())
    );
  }, [starterPacks, customOptions]);

  const handleAddOption = (text) => {
    const clean = String(text || '').trim();
    if (!clean || customOptions.length >= 10) return;
    if (customOptions.some((o) => o.toLowerCase() === clean.toLowerCase())) {
      addToast({ title: 'Already added', message: `"${clean}" is already in the list`, type: 'info' });
      return;
    }
    triggerHaptic('tap');
    setCustomOptions((prev) => [...(Array.isArray(prev) ? prev : []), clean]);
    setNewOptionText('');
    optionInputRef.current?.focus();
  };

  const handleRemoveOption = (index) => {
    triggerHaptic('tap');
    setCustomOptions((prev) => (Array.isArray(prev) ? prev.filter((_, i) => i !== index) : []));
  };

  const handleApplyStarter = (pack) => {
    triggerHaptic('like');
    if (!topic || !topic.trim()) setTopic(pack.question);
    setCustomOptions(pack.options);
    addToast({ title: `${pack.title} Loaded`, message: `${pack.options.length} options ready`, type: 'success' });
  };

  const handleSaveAndDone = () => {
    const cleanTopic = (topic || '').trim();
    if (!cleanTopic) {
      triggerHaptic('veto');
      addToast({ title: t('customQuestionRequired') || 'Question Required', message: 'Please set a question for your custom poll.', type: 'warning' });
      questionInputRef.current?.focus();
      return;
    }
    if ((customOptions || []).length < 2) {
      triggerHaptic('veto');
      addToast({ title: 'Options Needed', message: 'Please add at least 2 options for your group.', type: 'warning' });
      optionInputRef.current?.focus();
      return;
    }
    triggerHaptic('like');
    handleClose();
  };

  const isValid = Boolean(topic && topic.trim().length >= 2 && customOptions.length >= 2);
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
      aria-label="Custom Poll Configuration"
    >
      <div
        ref={panelRef}
        {...containerProps}
        className={`w-full sm:max-w-md max-h-[88dvh] sm:max-h-[85vh] bg-[var(--bg-elevated)] glass-surface rounded-t-[32px] sm:rounded-3xl p-5 pt-1 border border-[var(--border-glass)] shadow-[0_24px_64px_rgba(0,0,0,0.4)] flex flex-col gap-3.5 text-[var(--text-primary)] pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] sm:pb-5 ${
          isClosing ? 'animate-sheet-down sm:animate-scale-down' : 'animate-sheet-up sm:animate-modal-spring'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Apple Pro-Grade Drag Handle Pill */}
        <div {...grabberProps} className="w-full pt-2 pb-0 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none shrink-0" aria-label="Drag down to dismiss">
          <div className="w-10 h-1.2 rounded-full bg-[var(--text-tertiary)]/30 mx-auto my-2 mb-3 cursor-grab" />
        </div>

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--accent-bg)]/10 text-[var(--accent-bg)] flex items-center justify-center">
              <ListPlus size={18} />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">{t('catCustom') || 'Custom Poll'}</h2>
              <p className="text-[11px] text-[var(--text-secondary)]">Set a question and choices for your group</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-[var(--bg-inset)] hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer min-h-[36px]"
            aria-label="Close Custom Poll Drawer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto pr-0.5 flex flex-col gap-4 touch-pan-y overscroll-contain">
          {/* Section 1: Question Input */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between px-1">
              <label htmlFor="customTopicInput" className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1">
                <span>{t('customQuestionLabel') || 'Poll Question'}</span>
                <span className="text-amber-500 font-bold">*</span>
              </label>
              {!topic.trim() && <span className="text-[11px] font-medium text-amber-500">{t('customQuestionRequired') || 'Required'}</span>}
            </div>
            <div className="relative">
              <input
                ref={questionInputRef}
                id="customTopicInput"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={t('customPlaceholder') || 'What movie should we watch?'}
                className="w-full min-h-[44px] pl-3.5 pr-9 rounded-xl bg-[var(--bg-inset)] border border-[var(--border-main)] focus:border-[var(--accent-bg)] text-sm font-medium text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none transition-all"
              />
              {topic && (
                <button
                  type="button"
                  onClick={() => { triggerHaptic('tap'); setTopic(''); questionInputRef.current?.focus(); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] cursor-pointer"
                  aria-label="Clear question"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Quick Question Suggestions */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] tracking-wider flex items-center gap-1 pr-1">
                <Sparkles size={11} className="text-[var(--accent-bg)]" />
                <span>{t('customQuickTopics') || 'Suggestions'}</span>
              </span>
              {suggestedTopics.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => { triggerHaptic('tap'); setTopic(sug); optionInputRef.current?.focus(); }}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-[var(--bg-inset)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all active:scale-[0.97] cursor-pointer"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          {/* Section 2: Options Builder */}
          <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-subtle)]">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">{t('customAddOptionsLabel') || 'Poll Options'}</span>
              <span className={`text-[11px] font-bold tabular-nums px-2 py-0.5 rounded-full ${
                customOptions.length >= 10 ? 'bg-amber-500/15 text-amber-500' : customOptions.length >= 2 ? 'bg-emerald-500/15 text-emerald-500' : 'bg-[var(--bg-inset)] text-[var(--text-tertiary)]'
              }`}>
                {customOptions.length}/10 {t('optionsSuffix') || 'options'}
              </span>
            </div>

            {/* Text Input + Add Button */}
            <form onSubmit={(e) => { e.preventDefault(); handleAddOption(newOptionText); }} className="flex items-center gap-2">
              <input
                ref={optionInputRef}
                type="text"
                value={newOptionText}
                onChange={(e) => setNewOptionText(e.target.value)}
                placeholder={customOptions.length >= 10 ? 'Maximum 10 options reached' : t('customAddOptionPlaceholder') || 'Type an option and press Enter...'}
                disabled={customOptions.length >= 10}
                className="flex-1 min-h-[42px] px-3.5 rounded-xl bg-[var(--bg-inset)] border border-[var(--border-main)] text-sm font-medium text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-bg)] outline-none transition-all disabled:opacity-50"
              />
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={!newOptionText.trim() || customOptions.length >= 10}
                icon={Plus}
                className="h-[42px] px-3.5 rounded-xl font-bold shrink-0"
              >
                {t('customAddBtn') || 'Add'}
              </Button>
            </form>

            {/* Empty State: Quick Starter Chips */}
            {customOptions.length === 0 && (
              <div className="p-3.5 rounded-2xl bg-[var(--accent-bg)]/5 border border-dashed border-[var(--accent-bg)]/25 flex flex-col gap-2.5 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <Sparkles size={14} className="text-[var(--accent-bg)]" />
                    <span>Quick Starters</span>
                  </span>
                  <span className="text-[10px] text-[var(--text-tertiary)]">Tap to auto-fill</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {starterPacks.map((pack) => {
                    const Icon = pack.icon;
                    return (
                      <button
                        key={pack.id}
                        type="button"
                        onClick={() => handleApplyStarter(pack)}
                        className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--accent-bg)]/10 hover:border-[var(--accent-bg)]/30 border border-[var(--border-subtle)] text-left transition-all active:scale-[0.97] cursor-pointer group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-[var(--accent-bg)]/10 text-[var(--accent-bg)] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <Icon size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--accent-bg)] transition-colors">
                            {pack.title}
                          </div>
                          <div className="text-[10px] text-[var(--text-tertiary)] truncate">
                            {pack.options.length} options
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Added Options List */}
            {customOptions.length > 0 && (
              <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto overscroll-contain pr-0.5">
                {customOptions.map((opt, idx) => (
                  <div
                    key={`${idx}-${opt}`}
                    className="flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl bg-[var(--bg-inset)] border border-[var(--border-subtle)] hover:border-[var(--border-main)] transition-all animate-scale-up"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="w-5 h-5 rounded-full bg-[var(--accent-bg)]/15 text-[var(--accent-bg)] font-bold text-[11px] flex items-center justify-center shrink-0 tabular-nums">
                        {idx + 1}
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] truncate">{opt}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer shrink-0"
                      aria-label={`Remove ${opt}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Idea Chips to top-up options */}
            {customOptions.length > 0 && customOptions.length < 10 && contextualIdeas.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] tracking-wider pr-0.5">
                  {t('customQuickIdeas') || 'Quick ideas'}:
                </span>
                {contextualIdeas.slice(0, 4).map((idea) => (
                  <button
                    key={idea}
                    type="button"
                    onClick={() => handleAddOption(idea)}
                    className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-[var(--bg-inset)] hover:bg-[var(--accent-bg)]/10 hover:text-[var(--accent-bg)] border border-[var(--border-subtle)] text-[var(--text-secondary)] transition-all cursor-pointer active:scale-95"
                  >
                    + {idea}
                  </button>
                ))}
              </div>
            )}

            {/* Helper Alert if under 2 options */}
            {customOptions.length > 0 && customOptions.length < 2 && (
              <p className="text-[11px] text-amber-500 font-medium px-1 flex items-center gap-1 pt-0.5">
                <AlertCircle size={12} className="shrink-0" />
                <span>Add at least 2 options for your group to vote on.</span>
              </p>
            )}
          </div>
        </div>

        {/* Footer Action */}
        <div className="pt-2 border-t border-[var(--border-subtle)] shrink-0">
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleSaveAndDone}
            icon={Check}
            className="w-full h-12 rounded-2xl font-bold text-base shadow-[0_4px_16px_var(--accent-glow)]"
          >
            {isValid ? `Save Poll (${customOptions.length} ${t('optionsSuffix') || 'options'})` : 'Done'}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
