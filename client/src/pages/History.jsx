import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  Trophy,
  Users,
  Calendar,
  Sparkles,
  ArrowRight,
  Trash2,
} from 'lucide-react';
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

  const handleClearHistory = () => {
    localStorage.removeItem('consensus_history');
    setSessions([]);
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen pb-36 select-none">
      {/* PWA Mobile Header */}
      <header className="sticky top-0 z-30 glass-surface border-b border-[var(--border-subtle)] px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-1 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
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
              className="text-xs text-[var(--text-tertiary)] hover:text-[var(--status-danger)] transition-colors flex items-center gap-1 p-1"
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
                When your group completes a room vote, the consensus winner will be archived here.
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
          /* Mobile PWA Vertical Decision Cards Feed */
          <div className="flex flex-col gap-3">
            {sessions.map((s, idx) => (
              <div
                key={s.pin || idx}
                className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-main)] flex flex-col gap-3 shadow-sm hover:border-[var(--accent-bg)]/40 transition-colors"
              >
                {/* Header row: PIN + Date */}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[var(--accent-bg)] bg-[var(--accent-bg)]/10 px-2 py-0.5 rounded-md">
                    #{s.pin}
                  </span>
                  <div className="flex items-center gap-1 text-[11px] text-[var(--text-tertiary)]">
                    <Calendar size={12} />
                    <span>{s.date}</span>
                  </div>
                </div>

                {/* Topic & Winner */}
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
                    {s.topic}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[rgba(245,158,11,0.15)] flex items-center justify-center text-[var(--status-warning)] shrink-0">
                      <Trophy size={15} />
                    </div>
                    <span className="text-base font-extrabold text-[var(--text-primary)] tracking-tight">
                      {s.winner}
                    </span>
                  </div>
                </div>

                {/* Footer metadata pills */}
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

                  <button
                    type="button"
                    onClick={() => navigate(`/deck/${s.pin}`)}
                    className="flex items-center gap-1 text-xs font-semibold text-[var(--accent-bg)] hover:underline cursor-pointer"
                  >
                    <span>View Arena</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
