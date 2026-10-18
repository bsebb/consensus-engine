import React from 'react';
import { Sparkles } from 'lucide-react';
import Button from '../ui/Button';

export default function WaitingForBallotsView({
  isHost,
  votesReceived,
  quorumTotal,
  handleHostForceReveal,
}) {
  return (
    <main className="px-4 py-8 flex flex-col items-center justify-center text-center flex-1 my-auto animate-[modalSpring_0.35s_var(--spring-smooth)]">
      <div className="w-full rounded-2xl bg-[var(--bg-elevated)] p-8 border border-[var(--border-main)] flex flex-col items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-[var(--accent-bg)] text-white flex items-center justify-center shadow-[0_8px_24px_var(--accent-glow)] animate-pulse">
          <Sparkles size={32} />
        </div>

        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-bold text-[var(--text-primary)]">
            Tallying Group Ballots
          </h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Waiting for peers to complete swiping...
          </p>
        </div>

        <div className="w-full flex flex-col gap-2">
          <div className="flex justify-between text-xs font-semibold text-[var(--text-secondary)]">
            <span>Quorum Status</span>
            <span className="font-mono tabular-nums">{votesReceived} of {quorumTotal}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-[var(--bg-inset)] overflow-hidden">
            <div
              className="h-full bg-[var(--accent-bg)] transition-all duration-300 rounded-full"
              style={{ width: `${Math.min(100, (votesReceived / Math.max(1, quorumTotal)) * 100)}%` }}
            />
          </div>
        </div>

        {isHost ? (
          <div className="flex flex-col items-center gap-1.5 w-full mt-2">
            <Button
              variant="primary"
              size="md"
              onClick={handleHostForceReveal}
              className="w-full text-xs shadow-md"
            >
              Skip Waiting (Reveal for Everyone)
            </Button>
            <span className="text-[10px] text-[var(--text-tertiary)]">
              Host control: tallies submitted votes and reveals for all devices
            </span>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-[var(--bg-inset)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] mt-2 w-full text-center">
            Waiting for everyone to submit. Results will reveal together!
          </div>
        )}
      </div>
    </main>
  );
}
