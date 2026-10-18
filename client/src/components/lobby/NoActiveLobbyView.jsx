import React from 'react';
import { ArrowLeft, Users, ArrowRight, Settings } from 'lucide-react';
import Button from '../ui/Button';
import ThemeToggle from '../ThemeToggle';

export default function NoActiveLobbyView({ navigate, setSettingsOpen }) {
  return (
    <div className="flex-1 flex flex-col min-h-screen pb-28 select-none">
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
            Room Lobby
          </h1>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              aria-label="Open Settings"
              title="Preferences"
            >
              <Settings size={16} />
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="px-4 py-8 flex flex-col items-center justify-center flex-1 my-auto text-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-main)] flex items-center justify-center text-[var(--text-tertiary)] shadow-sm">
          <Users size={32} />
        </div>

        <div className="flex flex-col gap-1.5 max-w-xs">
          <h2 className="text-lg font-extrabold text-[var(--text-primary)] tracking-tight">
            No Active Lobby
          </h2>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            You are not currently in a consensus room. Enter a 4-digit code to join, or start a new decision.
          </p>
        </div>

        <div className="flex flex-col gap-2.5 w-full max-w-xs pt-2">
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('/')}
            icon={ArrowRight}
            className="w-full"
          >
            Enter Room PIN
          </Button>

          <button
            type="button"
            onClick={() => navigate('/host')}
            className="w-full py-2.5 px-4 rounded-xl bg-[var(--bg-elevated)] hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-primary)] border border-[var(--border-subtle)] text-xs font-semibold transition-colors cursor-pointer min-h-[40px]"
          >
            Host New Decision
          </button>
        </div>
      </main>
    </div>
  );
}
