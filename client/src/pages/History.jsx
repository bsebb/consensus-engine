import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  Trophy,
  Calendar,
  PlusCircle,
  Trash2,
  ChevronDown,
  ChevronUp,
  Navigation,
  CheckCircle2,
  Award,
  Settings,
} from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import Button from '../components/ui/Button';
import SettingsModal from '../components/ui/SettingsModal';
import { useLanguage } from '../context/LanguageContext';
import { triggerHaptic } from '../utils/haptics';

export default function History() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [storedSessions, setStoredSessions] = useState(null);
  const [expandedPin, setExpandedPin] = useState(null);

  // High-fidelity baseline entries dynamically localized for first-time visitors
  const sampleSessions = useMemo(() => [
    {
      pin: '4921',
      topic: t('historySampleDinner'),
      winner: 'Bistro del Sol',
      date: 'Oct 1, 2026',
      participantsCount: 4,
      priceLevel: 2,
      matchScore: 96,
      options: [
        { name: 'Bistro del Sol', priceLevel: 2, isWinner: true, duelMargin: t('historySampleWinnerSweep') },
        { name: 'Sakura Sushi Lounge', priceLevel: 3, isWinner: false, duelMargin: `${t('historySampleDefeatedBy')} Bistro del Sol (3-1)` },
        { name: 'Burger Craft Lab', priceLevel: 2, isWinner: false, duelMargin: `${t('historySampleDefeatedBy')} Bistro del Sol (4-0)` },
      ],
    },
    {
      pin: '8104',
      topic: t('historySampleCoffee'),
      winner: 'Artisan Roasters',
      date: 'Sep 28, 2026',
      participantsCount: 3,
      priceLevel: 1,
      matchScore: 92,
      options: [
        { name: 'Artisan Roasters', priceLevel: 1, isWinner: true, duelMargin: t('historySampleWinnerSweep') },
        { name: 'The Daily Grind', priceLevel: 1, isWinner: false, duelMargin: `${t('historySampleDefeatedBy')} Artisan Roasters (2-1)` },
        { name: 'Cinnamon & Sugar Bakery', priceLevel: 2, isWinner: false, duelMargin: `${t('historySampleDefeatedBy')} Artisan Roasters (3-0)` },
      ],
    },
  ], [t]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('consensus_history') || '[]');
      if (Array.isArray(stored) && stored.length > 0) {
        const sanitized = stored.map((s, idx) => {
          const winnerName = typeof s.winner === 'object' && s.winner !== null
            ? s.winner.name || s.winner.id || 'Consensus Option'
            : String(s.winner || 'Consensus Option');

          const topicStr = typeof s.topic === 'object' && s.topic !== null
            ? s.topic.name || 'Decision'
            : String(s.topic || 'Decision');

          return {
            ...s,
            winner: winnerName,
            topic: topicStr,
            priceLevel: typeof s.priceLevel === 'number' ? s.priceLevel : 2,
            participantsCount: typeof s.participantsCount === 'number' ? s.participantsCount : 4,
            matchScore: s.winnerDetails?.matchScore || s.matchScore || (idx === 0 ? 96 : 92),
            options: Array.isArray(s.options) && s.options.length > 0 ? s.options : [
              { name: winnerName, priceLevel: s.priceLevel || 2, isWinner: true, duelMargin: t('historyWinnerTag') },
            ],
          };
        });

        setStoredSessions(sanitized);
        if (sanitized.length > 0) setExpandedPin(sanitized[0].pin);
      } else {
        setStoredSessions(null);
        setExpandedPin('4921');
      }
    } catch {
      setStoredSessions(null);
      setExpandedPin('4921');
    }
  }, [t]);

  const sessions = storedSessions || sampleSessions;

  const handleClearHistory = () => {
    triggerHaptic('tap');
    localStorage.removeItem('consensus_history');
    setStoredSessions([]);
    setExpandedPin(null);
  };

  const toggleExpand = (pin) => {
    triggerHaptic('selection');
    setExpandedPin((prev) => (prev === pin ? null : pin));
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden select-none">
      {/* PWA Mobile Header */}
      <header className="sticky top-0 z-30 bg-[var(--bg-root)] border-b border-[var(--border-main)] px-4 safe-pt-header pb-3 shrink-0">
        <div className="relative flex items-center justify-between max-w-md mx-auto w-full min-h-[36px]">
          <div className="flex items-center z-10">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('tap');
                navigate('/');
              }}
              className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer py-1.5 px-3 rounded-full hover:bg-black/5 dark:hover:bg-white/5 min-h-[36px]"
              aria-label={t('back')}
            >
              <ArrowLeft size={16} />
              <span>{t('back')}</span>
            </button>
          </div>

          <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 flex items-center justify-center z-10 pointer-events-none">
            <h1 className="text-sm font-bold text-[var(--text-primary)] tracking-tight">
              {t('history')}
            </h1>
          </div>

          <div className="flex items-center gap-1.5 z-10">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('tap');
                setSettingsOpen(true);
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all cursor-pointer touch-manipulation"
              aria-label={t('prefTitle')}
              title={t('prefTitle')}
            >
              <Settings size={16} />
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 pt-3.5 pb-[max(env(safe-area-inset-bottom,0px),1.5rem)] flex flex-col gap-3.5 flex-1 min-h-0 overflow-y-auto overscroll-contain max-w-md mx-auto w-full">
        {/* Section Header: Clean headline without duplicate labels */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-baseline gap-2">
            <h2 className="text-lg font-black text-[var(--text-primary)] tracking-tight">
              {t('history')}
            </h2>
            <span className="text-xs font-semibold text-[var(--text-tertiary)] tabular-nums">
              ({sessions.length})
            </span>
          </div>

          {sessions.length > 0 && (
            <button
              type="button"
              onClick={handleClearHistory}
              className="text-xs font-medium text-[var(--text-tertiary)] hover:text-[var(--status-danger)] transition-colors flex items-center gap-1.5 p-1.5 rounded-md min-h-[36px] cursor-pointer"
              title={t('clearHistoryBtn')}
            >
              <Trash2 size={13} />
              <span>{t('clearHistoryBtn')}</span>
            </button>
          )}
        </div>

        {sessions.length === 0 ? (
          /* Empty State */
          <div className="rounded-3xl bg-[var(--bg-elevated)] p-8 text-center flex flex-col items-center gap-4 my-8 border border-[var(--border-main)] shadow-2xs">
            <div className="w-14 h-14 rounded-2xl bg-[var(--bg-inset)] flex items-center justify-center text-[var(--text-tertiary)]">
              <Clock size={28} />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                {t('historyEmptyTitle')}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] max-w-xs leading-relaxed">
                {t('historyEmptyDesc')}
              </p>
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                triggerHaptic('tap');
                navigate('/');
              }}
              icon={PlusCircle}
            >
              {t('historyStartPick')}
            </Button>
          </div>
        ) : (
          /* Decision Cards Feed with Smooth Accordion Drawer */
          <div className="flex flex-col gap-3">
            {sessions.map((s, idx) => {
              const isExpanded = expandedPin === s.pin;
              const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                `${s.winner} restaurant`
              )}`;

              return (
                <div
                  key={s.pin || idx}
                  className="rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-main)] flex flex-col shadow-2xs transition-all duration-200 overflow-hidden"
                >
                  {/* Card Summary Header Button */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(s.pin)}
                    aria-expanded={isExpanded}
                    className="w-full text-left p-4 flex flex-col gap-2.5 cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors focus:outline-none"
                  >
                    {/* Row 1: Topic Title + PIN and Date */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[var(--text-secondary)] truncate">
                        {s.topic}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-[11px] font-bold text-[var(--accent-bg)] bg-[var(--accent-bg)]/10 px-2 py-0.5 rounded-md">
                          #{s.pin}
                        </span>
                        <span className="text-[11px] text-[var(--text-tertiary)] flex items-center gap-1">
                          <Calendar size={11} />
                          <span>{s.date}</span>
                        </span>
                      </div>
                    </div>

                    {/* Row 2: Winner Spotlight */}
                    <div className="flex items-center justify-between gap-3 pt-0.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0 shadow-2xs">
                          <Trophy size={16} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-base font-extrabold text-[var(--text-primary)] truncate leading-snug">
                            {s.winner}
                          </div>
                          <div className="text-[11px] font-semibold text-[var(--status-success)] flex items-center gap-1">
                            <span>{t('historyWinnerPick')}</span>
                            <span>·</span>
                            <span>{s.matchScore}% {t('historyAgreement')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="w-7 h-7 rounded-lg bg-[var(--bg-inset)] flex items-center justify-center text-[var(--text-secondary)] shrink-0 transition-transform duration-200">
                        {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </div>
                    </div>

                    {/* Row 3: Metadata Badges */}
                    <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium text-[var(--text-secondary)] bg-[var(--bg-inset)] px-2 py-0.5 rounded-full border border-[var(--border-subtle)]">
                          {s.participantsCount || 4} {t('historyVoters')}
                        </span>
                        <span className="text-xs font-mono font-bold text-[var(--text-secondary)]">
                          {'$'.repeat(s.priceLevel || 2)}
                        </span>
                      </div>

                      <span className="text-xs font-semibold text-[var(--accent-bg)]">
                        {isExpanded ? t('close') : t('details')}
                      </span>
                    </div>
                  </button>

                  {/* 60fps GPU Accordion Tray */}
                  <div className={`accordion-drawer ${isExpanded ? 'open' : ''}`}>
                    <div className="accordion-drawer-inner px-4 pb-4 pt-1 border-t border-[var(--border-subtle)] bg-[var(--bg-inset)]/40 flex flex-col gap-3">
                      {/* Standings List */}
                      <div className="flex flex-col gap-1.5 pt-1">
                        <div className="flex items-center justify-between px-0.5 text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
                          <span className="flex items-center gap-1">
                            <Award size={12} />
                            <span>{t('historyRankings')}</span>
                          </span>
                          <span className="text-[10px] tabular-nums font-normal lowercase">
                            {s.options?.length || 0} {t('optionsSuffix')}
                          </span>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          {s.options?.map((opt, oIdx) => (
                            <div
                              key={oIdx}
                              className={`p-2.5 rounded-2xl border flex items-center justify-between text-xs transition-colors ${
                                opt.isWinner
                                  ? 'bg-[var(--accent-bg)]/10 border-[var(--accent-bg)]/25 text-[var(--text-primary)] shadow-2xs'
                                  : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-primary)]'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="font-mono text-xs font-bold text-[var(--text-tertiary)] w-4 text-center shrink-0">
                                  {opt.isWinner ? '1' : oIdx + 1}
                                </span>
                                <div className="flex flex-col min-w-0">
                                  <div className="font-bold truncate text-xs flex items-center gap-1.5">
                                    <span>{opt.name}</span>
                                    {opt.isWinner && (
                                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-[var(--accent-bg)] text-white shrink-0">
                                        {t('historyWinnerTag')}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-[var(--text-tertiary)] truncate">
                                    {opt.duelMargin || opt.category}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs font-mono font-bold text-[var(--text-secondary)]">
                                  {'$'.repeat(opt.priceLevel || 2)}
                                </span>
                                {opt.isWinner && (
                                  <CheckCircle2 size={15} className="text-[var(--status-success)] shrink-0" />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Balanced 2-Column Action Buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => triggerHaptic('tap')}
                          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[var(--bg-surface)] hover:bg-black/5 dark:hover:bg-white/5 border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-primary)] transition-colors shadow-2xs cursor-pointer min-h-[38px]"
                        >
                          <Navigation size={13} className="text-[var(--accent-bg)]" />
                          <span>{t('historyDirections')}</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic('tap');
                            navigate(`/deck/${s.pin}`, {
                              state: {
                                resolved: true,
                                winner: s.winner,
                                topic: s.topic,
                                totalParticipants: s.participantsCount,
                                priceLevel: s.priceLevel,
                                matchScore: s.matchScore,
                              },
                            });
                          }}
                          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[var(--accent-bg)] text-white hover:opacity-95 text-xs font-bold transition-opacity shadow-2xs cursor-pointer min-h-[38px]"
                        >
                          <Trophy size={13} />
                          <span>{t('historyWinnerCard')}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Global Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
