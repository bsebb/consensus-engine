import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Clock, Trophy, Users, Calendar, ArrowRight, Sparkles } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import Button from '../components/ui/Button';
import StatusBadge from '../components/ui/StatusBadge';

export default function History() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('consensus_history') || '[]');
      if (Array.isArray(stored) && stored.length > 0) {
        const sanitized = stored.map((s) => ({
          ...s,
          winner:
            typeof s.winner === 'object' && s.winner !== null
              ? s.winner.name || s.winner.id || 'Consensus Option'
              : String(s.winner || 'Consensus Option'),
          topic:
            typeof s.topic === 'object' && s.topic !== null
              ? s.topic.name || 'Decision'
              : String(s.topic || 'Decision'),
          priceLevel: typeof s.priceLevel === 'number' ? s.priceLevel : 2,
          participantsCount: typeof s.participantsCount === 'number' ? s.participantsCount : 4,
        }));
        setSessions(sanitized);
      } else {
        // Sample baseline entries for demonstration
        setSessions([
          {
            pin: '4921',
            topic: 'Friday Dinner Decision',
            winner: 'Bistro del Sol',
            date: 'Oct 1, 2026',
            participantsCount: 4,
            priceLevel: 2,
          },
          {
            pin: '8104',
            topic: 'Team Coffee Break',
            winner: 'Artisan Roasters',
            date: 'Sep 28, 2026',
            participantsCount: 3,
            priceLevel: 1,
          },
        ]);
      }
    } catch (err) {
      console.warn('[History] LocalStorage read error:', err);
    }
  }, []);

  return (
    <div className="min-h-screen pb-16 select-none">
      
      {/* Top Header */}
      <header className="sticky top-0 z-30 liquid-glass border-b border-[var(--border-subtle)] px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-1 text-sm font-medium text-[var(--accent-bg)] hover:opacity-80 transition-opacity cursor-pointer"
          >
            <ChevronLeft size={18} />
            <span>Home</span>
          </button>

          <h2 className="text-base font-semibold text-[var(--ios-label)]">
            Past Decisions Log
          </h2>

          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 pt-6 flex flex-col gap-6">
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--ios-label)]">
              Resolved Sessions
            </h1>
            <p className="text-xs text-[var(--ios-secondary-label)] mt-0.5">
              Historical record of group consensus agreements
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/host')}
            icon={Sparkles}
          >
            New Session
          </Button>
        </div>

        {sessions.length === 0 ? (
          /* Empty State */
          <div className="liquid-glass rounded-3xl p-10 text-center flex flex-col items-center gap-4 my-8 border border-[var(--border-glass)]">
            <div className="w-14 h-14 rounded-2xl bg-black/5 dark:bg-white/10 flex items-center justify-center text-[var(--ios-secondary-label)]">
              <Clock size={28} />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-semibold text-[var(--ios-label)]">
                No Decisions Yet
              </h3>
              <p className="text-xs text-[var(--ios-secondary-label)] max-w-xs">
                When your group completes a room vote, the consensus winner will be archived here.
              </p>
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/host')}
            >
              Host First Decision
            </Button>
          </div>
        ) : (
          /* Zero-Reflow Table with Hardware <colgroup> */
          <div className="settings-card-group overflow-x-auto">
            <table className="w-full text-left border-collapse table-fixed min-w-[540px]">
              <colgroup>
                <col className="w-[100px]" />
                <col className="w-[180px]" />
                <col className="w-[150px]" />
                <col className="w-[110px]" />
              </colgroup>
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-black/[0.02] dark:bg-white/[0.04]">
                  <th className="py-2.5 px-3.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--ios-secondary-label)]">
                    Room PIN
                  </th>
                  <th className="py-2.5 px-3.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--ios-secondary-label)]">
                    Topic
                  </th>
                  <th className="py-2.5 px-3.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--ios-secondary-label)]">
                    Winner
                  </th>
                  <th className="py-2.5 px-3.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--ios-secondary-label)] text-right">
                    Quorum
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {sessions.map((s, idx) => (
                  <tr
                    key={s.pin || idx}
                    className="hover:bg-black/[0.02] dark:hover:bg-white/[0.04] transition-colors"
                  >
                    <td className="py-3 px-3.5 font-mono text-xs font-bold text-[var(--accent-bg)]">
                      #{s.pin}
                    </td>
                    <td className="py-3 px-3.5">
                      <div className="text-xs font-semibold text-[var(--ios-label)] truncate">
                        {s.topic}
                      </div>
                      <div className="text-[10px] text-[var(--ios-tertiary-label)] flex items-center gap-1 mt-0.5">
                        <Calendar size={10} />
                        <span>{s.date}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ios-label)]">
                        <Trophy size={13} className="text-[var(--semantic-warning)] shrink-0" />
                        <span className="truncate">
                          {typeof s.winner === 'object' && s.winner !== null
                            ? s.winner.name || s.winner.id || 'Consensus Option'
                            : String(s.winner || 'Consensus Option')}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3.5 text-right">
                      <StatusBadge
                        status="neutral"
                        label={`${s.participantsCount || 4} Peers`}
                        size="sm"
                        className="ml-auto"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
