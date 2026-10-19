import React, { useState, useMemo } from 'react';
import { Plus, X, Sparkles, Check, HelpCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { triggerHaptic } from '../../utils/haptics';

export default function CustomPollBuilder({
  topic,
  setTopic,
  customOptions = [],
  setCustomOptions,
}) {
  const { lang, t } = useLanguage();
  const [newOptionText, setNewOptionText] = useState('');

  const suggestedTopics = useMemo(() => {
    if (lang === 'ro') {
      return [
        'Unde ieșim diseară?',
        'Ce film vizionăm?',
        'Ce comandăm de mâncare?',
        'Unde mergem în weekend?',
        'Ce board game jucăm?',
      ];
    }
    if (lang === 'ru') {
      return [
        'Куда пойдём сегодня?',
        'Какой фильм посмотрим?',
        'Что закажем поесть?',
        'Куда поедем на выходные?',
        'В какую настолку сыграем?',
      ];
    }
    return [
      'Where should we hang out?',
      'What movie should we watch?',
      'What should we order?',
      'Where to this weekend?',
      'What game should we play?',
    ];
  }, [lang]);

  const starterIdeas = useMemo(() => {
    const lower = String(topic || '').toLowerCase();
    if (lower.includes('film') || lower.includes('movie') || lower.includes('cinema') || lower.includes('кино')) {
      return ['Inception', 'Interstellar', 'Dune', 'Oppenheimer', 'The Batman', 'Spirited Away'];
    }
    if (lower.includes('mânc') || lower.includes('eat') || lower.includes('food') || lower.includes('comanda') || lower.includes('order') || lower.includes('поесть')) {
      return ['Pizza Night', 'Sushi & Rolls', 'Smash Burgers', 'Pasta Bar', 'Street Tacos', 'Asian Wok'];
    }
    if (lower.includes('game') || lower.includes('juc') || lower.includes('joc') || lower.includes('настол')) {
      return ['Catan', 'Codenames', 'Monopoly', 'Jackbox Party', 'Poker', 'Chess'];
    }
    if (lang === 'ro') {
      return ['Pizza în oraș', 'Board Games', 'Escape Room', 'Bowling', 'Seară de filme', 'Grătar & Picnic'];
    }
    if (lang === 'ru') {
      return ['Пицца в городе', 'Настольные игры', 'Квест-комната', 'Боулинг', 'Вечер кино', 'Шашлыки / Пикник'];
    }
    return ['Pizza Night', 'Board Games', 'Escape Room', 'Bowling Night', 'Movie Marathon', 'Barbecue & Picnic'];
  }, [topic, lang]);

  const handleAddOption = (text) => {
    const clean = String(text || '').trim();
    if (!clean) return;
    triggerHaptic('tap');
    setCustomOptions((prev) => {
      const arr = Array.isArray(prev) ? prev : [];
      if (arr.some((o) => o.toLowerCase() === clean.toLowerCase())) return arr;
      return [...arr, clean];
    });
    setNewOptionText('');
  };

  const handleRemoveOption = (index) => {
    triggerHaptic('tap');
    setCustomOptions((prev) => (Array.isArray(prev) ? prev.filter((_, i) => i !== index) : []));
  };

  const hasTopic = Boolean(topic && topic.trim().length >= 2);

  return (
    <div className="flex flex-col gap-3.5 animate-[modalSpring_0.25s_var(--spring-smooth)]">
      {/* Question / Topic Input */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between px-1">
          <label htmlFor="customTopicInput" className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1">
            <span>{t('customQuestionLabel')}</span>
            <span className="text-amber-500 font-bold">*</span>
          </label>
          {!hasTopic && (
            <span className="text-[11px] font-medium text-amber-500">
              {t('customQuestionRequired')}
            </span>
          )}
        </div>

        <div className="relative">
          <input
            id="customTopicInput"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={t('customPlaceholder')}
            className={`w-full min-h-[44px] pl-3.5 pr-9 rounded-xl bg-[var(--bg-inset)] border text-sm font-medium text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none transition-all ${
              !hasTopic
                ? 'border-amber-500/50 focus:border-amber-500'
                : 'border-[var(--border-main)] focus:border-[var(--accent-bg)]'
            }`}
          />
          {topic ? (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('tap');
                setTopic('');
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] cursor-pointer"
              aria-label="Clear topic"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>

        {/* Quick Topic Suggestions */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] tracking-wider flex items-center gap-1 pr-1">
            <Sparkles size={11} className="text-[var(--accent-bg)]" />
            <span>{t('customQuickTopics')}</span>
          </span>
          {suggestedTopics.map((sug) => (
            <button
              key={sug}
              type="button"
              onClick={() => {
                triggerHaptic('tap');
                setTopic(sug);
              }}
              className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-[var(--bg-inset)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all active:scale-[0.97] cursor-pointer"
            >
              {sug}
            </button>
          ))}
        </div>
      </div>

      {/* Starter Options Builder */}
      <div className="flex flex-col gap-2 pt-1 border-t border-[var(--border-subtle)]">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold text-[var(--text-secondary)]">
            {t('customAddOptionsLabel')}
          </span>
          {customOptions.length > 0 && (
            <span className="text-[11px] font-bold text-[var(--accent-bg)] tabular-nums">
              {customOptions.length} {t('selectedSuffix')}
            </span>
          )}
        </div>

        {/* Option Input + Add Button */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAddOption(newOptionText);
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={newOptionText}
            onChange={(e) => setNewOptionText(e.target.value)}
            placeholder={t('customAddOptionPlaceholder')}
            className="flex-1 min-h-[40px] px-3.5 rounded-xl bg-[var(--bg-inset)] border border-[var(--border-main)] text-xs sm:text-sm font-medium text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-bg)] outline-none transition-all"
          />
          <button
            type="submit"
            disabled={!newOptionText.trim()}
            className="min-h-[40px] px-3.5 rounded-xl bg-[var(--accent-bg)] hover:bg-[var(--accent-bg)]/90 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:cursor-not-allowed active:scale-[0.97]"
          >
            <Plus size={14} />
            <span>{t('customAddBtn')}</span>
          </button>
        </form>

        {/* Added Option Chips */}
        {customOptions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 py-1">
            {customOptions.map((opt, idx) => (
              <span
                key={`${idx}-${opt}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[var(--accent-bg)]/10 border border-[var(--accent-bg)]/20 text-xs font-bold text-[var(--text-primary)] shadow-2xs"
              >
                <span>{opt}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveOption(idx)}
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:text-red-500 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  aria-label={`Remove ${opt}`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Starter Idea Suggestions */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] tracking-wider pr-1">
            {t('customQuickIdeas')}:
          </span>
          {starterIdeas
            .filter((idea) => !customOptions.some((o) => o.toLowerCase() === idea.toLowerCase()))
            .slice(0, 5)
            .map((idea) => (
              <button
                key={idea}
                type="button"
                onClick={() => handleAddOption(idea)}
                className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[var(--bg-inset)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer active:scale-[0.97]"
              >
                + {idea}
              </button>
            ))}
        </div>

        <p className="text-[11px] text-[var(--text-tertiary)] px-1 leading-relaxed">
          {t('customLobbyAddHint')}
        </p>
      </div>
    </div>
  );
}
