import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  Trophy,
  Users,
  Calendar,
  Sparkles,
  Trash2,
  ChevronDown,
  ChevronUp,
  Navigation,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Flame,
  Award,
} from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import Button from '../components/ui/Button';
import StatusBadge from '../components/ui/StatusBadge';
import MilledTray from '../components/ui/MilledTray';

export default function History() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [expandedPin, setExpandedPin] = useState(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('consensus_history') || '[]');
      if (Array.isArray(stored) && stored.length > 0) {
        const sanitized = stored.map((s, idx) => {
          const winnerName =
            typeof s.winner === 'object' && s.winner !== null
              ? s.winner.name || s.winner.id || 'Consensus Option'
              : String(s.winner || 'Consensus Option');

          const topicStr =
            typeof s.topic === 'object' && s.topic !== null
              ? s.topic.name || 'Decision'
              : String(s.topic || 'Decision');

          // Fallback options list if session was saved in older format
          const defaultOptions = [
            {
              name: winnerName,
              category: 'Consensus Winner',
              priceLevel: s.priceLevel || 2,
              isWinner: true,
              duelMargin: 'Won all pairwise duels',
            },
            {
              name: 'Alternative Candidate A',
              category: 'Runner Up',
              priceLevel: (s.priceLevel || 2) + 1 > 4 ? 2 : (s.priceLevel || 2) + 1,
              isWinner: false,
              duelMargin: `Defeated by ${winnerName} (3-1)`,
            },
            {
              name: 'Alternative Candidate B',
              category: 'Runner Up',
              priceLevel: s.priceLevel || 2,
              isWinner: false,
              duelMargin: `Defeated by ${winnerName} (4-0)`,
            },
          ];

          const defaultDuels = [
            `Beat Alternative Candidate A (3-1)`,
            `Beat Alternative Candidate B (4-0)`,
          ];

          return {
            ...s,
            winner: winnerName,
            topic: topicStr,
            priceLevel: typeof s.priceLevel === 'number' ? s.priceLevel : 2,
            participantsCount: typeof s.participantsCount === 'number' ? s.participantsCount : 4,
            matchScore: s.winnerDetails?.matchScore || s.matchScore || (idx === 0 ? 96 : 92),
            options: Array.isArray(s.options) && s.options.length > 0 ? s.options : defaultOptions,
            pairwiseDuels: Array.isArray(s.pairwiseDuels) && s.pairwiseDuels.length > 0
              ? s.pairwiseDuels.map(d => typeof d === 'string' ? d : d.margin || `Beat ${d.opponent} (${d.score})`)
              : defaultDuels,
          };
        });

        setSessions(sanitized);
        if (sanitized.length > 0) {
          setExpandedPin(sanitized[0].pin);
        }
      } else {
        // High-fidelity baseline entries for presentation demonstration
        const sampleSessions = [
          {
            pin: '4921',
            topic: 'Friday Dinner Decision',
            winner: 'Bistro del Sol',
            date: 'Oct 1, 2026',
            participantsCount: 4,
            priceLevel: 2,
            matchScore: 96,
            options: [
              {
                name: 'Bistro del Sol',
                category: 'Italian & Mediterranean',
                priceLevel: 2,
                isWinner: true,
                duelMargin: 'Consensus Champion (3-0 head-to-head sweep)',
              },
              {
                name: 'Sakura Sushi Lounge',
                category: 'Japanese & Raw Bar',
                priceLevel: 3,
                isWinner: false,
                duelMargin: 'Defeated 3-1 by Bistro del Sol',
              },
              {
                name: 'Burger Craft Lab',
                category: 'Artisan Burgers & Craft Beer',
                priceLevel: 2,
                isWinner: false,
                duelMargin: 'Defeated 4-0 by Bistro del Sol',
              },
              {
                name: 'Old Town Steakhouse',
                category: 'Steaks & Fine Dining',
                priceLevel: 4,
                isWinner: false,
                isVetoed: true,
                duelMargin: 'Eliminated by participant veto',
              },
            ],
            pairwiseDuels: [
              'Beat Sakura Sushi Lounge (3-1)',
              'Beat Burger Craft Lab (4-0)',
              'Old Town Steakhouse eliminated by veto',
            ],
          },
          {
            pin: '8104',
            topic: 'Team Coffee Break',
            winner: 'Artisan Roasters',
            date: 'Sep 28, 2026',
            participantsCount: 3,
            priceLevel: 1,
            matchScore: 92,
            options: [
              {
                name: 'Artisan Roasters',
                category: 'Specialty Espresso & Pastries',
                priceLevel: 1,
                isWinner: true,
                duelMargin: 'Consensus Champion (Unanimous rank #1)',
              },
              {
                name: 'The Daily Grind',
                category: 'Coffee & Breakfast',
                priceLevel: 1,
                isWinner: false,
                duelMargin: 'Defeated 2-1 by Artisan Roasters',
              },
              {
                name: 'Cinnamon & Sugar Bakery',
                category: 'Patisserie & Cafe',
                priceLevel: 2,
                isWinner: false,
                duelMargin: 'Defeated 3-0 by Artisan Roasters',
              },
            ],
            pairwiseDuels: [
              'Beat The Daily Grind (2-1)',
              'Beat Cinnamon & Sugar Bakery (3-0)',
            ],
          },
        ];

        setSessions(sampleSessions);
        setExpandedPin(sampleSessions[0].pin);
      }
    } catch (err) {
      console.warn('[History] LocalStorage read error:', err);
    }
  }, []);

  const handleClearHistory = () => {
    localStorage.removeItem('consensus_history');
    setSessions([]);
    setExpandedPin(null);
  };

  const toggleExpand = (pin) => {
    setExpandedPin((prev) => (prev === pin ? null : pin));
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen pb-28 select-none">
      {/* PWA Mobile Header */}
      <header className="sticky top-0 z-30 glass-surface border-b border-[var(--border-subtle)] px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer py-1.5 px-2.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 min-h-[36px]"
            aria-label="Back to Home"
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>

          <h1 className="text-sm font-bold text-[var(--text-primary)] tracking-tight">
            Decision Ledger
          </h1>

          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 pt-4 flex flex-col gap-4 flex-1">
        <div className="flex items-center justify-between px-1">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              Historical Agreements
            </span>
            <h2 className="text-lg font-extrabold text-[var(--text-primary)] tracking-tight">
              Resolved Sessions ({sessions.length})
            </h2>
          </div>

          {sessions.length > 0 && (
            <button
              type="button"
              onClick={handleClearHistory}
              className="text-xs text-[var(--text-tertiary)] hover:text-[var(--status-danger)] transition-colors flex items-center gap-1.5 p-1.5 rounded-md min-h-[36px] cursor-pointer"
              title="Clear History"
            >
              <Trash2 size={13} />
              <span>Clear</span>
            </button>
          )}
        </div>

        {sessions.length === 0 ? (
          /* Empty State */
          <div className="rounded-2xl bg-[var(--bg-elevated)] p-8 text-center flex flex-col items-center gap-4 my-8 border border-[var(--border-main)]">
            <div className="w-14 h-14 rounded-2xl bg-[var(--bg-inset)] flex items-center justify-center text-[var(--text-tertiary)]">
              <Clock size={28} />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                No Decisions Yet
              </h3>
              <p className="text-xs text-[var(--text-secondary)] max-w-xs">
                When your group completes a room vote, the consensus winner and arena breakdown will be archived here.
              </p>
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/host')}
              icon={Sparkles}
            >
              Host First Decision
            </Button>
          </div>
        ) : (
          /* Vertical Decision Cards Feed with Rich Arena Breakdown */
          <div className="flex flex-col gap-3">
            {sessions.map((s, idx) => {
              const isExpanded = expandedPin === s.pin;
              const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                `${s.winner} restaurant`
              )}`;

              return (
                <div
                  key={s.pin || idx}
                  className="rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-main)] flex flex-col shadow-sm transition-all duration-200 overflow-hidden"
                >
                  {/* Card Main Summary Header */}
                  <div
                    onClick={() => toggleExpand(s.pin)}
                    className="p-4 flex flex-col gap-3 cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Header Row: PIN, Resolved Badge, Date */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[var(--accent-bg)] bg-[var(--accent-bg)]/10 px-2 py-0.5 rounded-md">
                          #{s.pin}
                        </span>
                        <StatusBadge status="success" label="Resolved" size="sm" />
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-[var(--text-tertiary)]">
                        <Calendar size={12} />
                        <span>{s.date}</span>
                      </div>
                    </div>

                    {/* Topic & Winner Spotlight */}
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
                        {s.topic}
                      </span>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[rgba(245,158,11,0.15)] flex items-center justify-center text-[var(--status-warning)] shrink-0 shadow-sm">
                            <Trophy size={16} />
                          </div>
                          <div>
                            <span className="text-base font-extrabold text-[var(--text-primary)] tracking-tight block leading-tight">
                              {s.winner}
                            </span>
                            <span className="text-[10px] text-[var(--status-success)] font-bold uppercase tracking-wider">
                              Consensus Winner ({s.matchScore}% Match)
                            </span>
                          </div>
                        </div>

                        {/* Expand Chevron */}
                        <div className="w-8 h-8 rounded-lg bg-[var(--bg-inset)] flex items-center justify-center text-[var(--text-secondary)]">
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </div>
                    </div>

                    {/* Quick Metadata Row */}
                    <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <StatusBadge
                          status="neutral"
                          label={`${s.participantsCount || 4} Voters`}
                          size="sm"
                        />
                        <span className="text-xs font-mono font-bold text-[var(--text-secondary)]">
                          {'$'.repeat(s.priceLevel || 2)}
                        </span>
                      </div>

                      <span className="text-xs font-semibold text-[var(--accent-bg)] flex items-center gap-1">
                        <span>{isExpanded ? 'Hide Details' : 'Arena Breakdown'}</span>
                      </span>
                    </div>
                  </div>

                  {/* Expanded Arena Consensus Breakdown Tray */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-[var(--border-subtle)] bg-[var(--bg-inset)]/50 flex flex-col gap-3.5 animate-[fadeIn_0.2s_var(--spring-smooth)]">
                      {/* Section 1: Competing Options Breakdown */}
                      <div className="flex flex-col gap-1.5 pt-2">
                        <div className="flex items-center justify-between px-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] flex items-center gap-1">
                            <Award size={12} />
                            <span>Voted Options & Final Standings</span>
                          </span>
                          <span className="text-[10px] font-mono text-[var(--text-tertiary)]">
                            {s.options?.length || 0} options
                          </span>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          {s.options?.map((opt, oIdx) => (
                            <div
                              key={oIdx}
                              className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                                opt.isWinner
                                  ? 'bg-[var(--accent-bg)]/10 border-[var(--accent-bg)]/30 text-[var(--text-primary)] shadow-sm'
                                  : opt.isVetoed
                                  ? 'bg-rose-500/10 border-rose-500/20 text-[var(--text-secondary)]'
                                  : 'bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-primary)]'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-mono text-[11px] font-black text-[var(--text-tertiary)] w-4 text-center shrink-0">
                                  {opt.isWinner ? '1' : oIdx + 1}
                                </span>
                                <div className="flex flex-col min-w-0">
                                  <span className="font-bold truncate text-[13px] flex items-center gap-1.5">
                                    {opt.name}
                                    {opt.isWinner && (
                                      <span className="text-[9px] uppercase font-mono font-extrabold px-1.5 py-0.2 rounded bg-[var(--accent-bg)] text-white">
                                        Champion
                                      </span>
                                    )}
                                    {opt.isVetoed && (
                                      <span className="text-[9px] uppercase font-mono font-extrabold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-500 flex items-center gap-0.5">
                                        <Flame size={10} />
                                        Vetoed
                                      </span>
                                    )}
                                  </span>
                                  <span className="text-[10px] text-[var(--text-tertiary)] truncate">
                                    {opt.duelMargin || opt.category}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs font-mono font-bold text-[var(--text-secondary)]">
                                  {'$'.repeat(opt.priceLevel || 2)}
                                </span>
                                {opt.isWinner ? (
                                  <CheckCircle2 size={16} className="text-[var(--status-success)]" />
                                ) : opt.isVetoed ? (
                                  <XCircle size={16} className="text-[var(--status-danger)]" />
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Section 2: Pairwise Condorcet Graph Duels */}
                      {s.pairwiseDuels && s.pairwiseDuels.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] flex items-center gap-1 px-0.5">
                            <Sparkles size={12} />
                            <span>Pairwise Condorcet Head-to-Head Duels</span>
                          </span>
                          <div className="grid grid-cols-1 gap-1">
                            {s.pairwiseDuels.map((duel, dIdx) => (
                              <div
                                key={dIdx}
                                className="px-2.5 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[11px] font-medium text-[var(--text-secondary)] flex items-center justify-between"
                              >
                                <span>{duel}</span>
                                <span className="text-[10px] font-mono text-[var(--status-success)] font-bold">
                                  WIN
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Section 3: Action Buttons */}
                      <div className="pt-2 flex flex-col gap-2">
                        {/* Google Maps Directions */}
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2.5 px-3 rounded-xl bg-[var(--bg-elevated)] hover:bg-black/5 dark:hover:bg-white/5 border border-[var(--border-subtle)] flex items-center justify-center gap-2 text-xs font-bold text-[var(--text-primary)] transition-colors shadow-sm cursor-pointer min-h-[40px]"
                        >
                          <Navigation size={14} className="text-[var(--accent-bg)]" />
                          <span>Turn-by-Turn Navigation (Google Maps)</span>
                          <ExternalLink size={12} className="text-[var(--text-tertiary)]" />
                        </a>

                        {/* Full Arena Screen Preview */}
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/deck/${s.pin}`, {
                              state: {
                                resolved: true,
                                winner: s.winner,
                                topic: s.topic,
                                totalParticipants: s.participantsCount,
                                priceLevel: s.priceLevel,
                                matchScore: s.matchScore,
                              },
                            })
                          }
                          className="w-full py-2.5 px-3 rounded-xl bg-[var(--accent-bg)] text-white hover:opacity-90 flex items-center justify-center gap-2 text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-98 min-h-[40px]"
                        >
                          <Trophy size={14} />
                          <span>Open Full Arena Victory Screen</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
