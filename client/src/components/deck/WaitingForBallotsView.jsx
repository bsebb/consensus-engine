import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import Button from '../ui/Button';

export default function WaitingForBallotsView({
  isHost,
  votesReceived,
  quorumTotal,
  handleHostForceReveal,
}) {
  return (
    <main className="px-4 py-4 safe-pb flex flex-col items-center justify-center text-center flex-1 min-h-0 max-w-md mx-auto w-full overflow-hidden animate-[modalSpring_0.35s_var(--spring-smooth)]">
      <div className="w-full rounded-3xl bg-[var(--bg-elevated)] p-6 border border-[var(--border-main)] flex flex-col items-center gap-4 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-[var(--accent-bg)] text-white flex items-center justify-center shadow-[0_8px_24px_var(--accent-glow)] animate-pulse">
          <CheckCircle2 size={28} />
        </div>

        <div className="flex flex-col gap-1">
          <h3 className="text-lg sm:text-xl font-black text-[var(--text-primary)]">
            You're All Done!
          </h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Waiting for your friends to finish swiping...
          </p>
        </div>

        <div className="w-full flex flex-col gap-1.5">
          <div className="flex justify-between text-xs font-semibold text-[var(--text-secondary)]">
            <span>Group Progress</span>
            <span className="font-bold tabular-nums text-[var(--text-primary)]">
              {votesReceived} of {quorumTotal} finished
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-[var(--bg-inset)] overflow-hidden">
            <div
              className="h-full bg-[var(--accent-bg)] transition-all duration-300 rounded-full"
              style={{ width: `${Math.min(100, (votesReceived / Math.max(1, quorumTotal)) * 100)}%` }}
            />
          </div>
        </div>

        {isHost ? (
          <div className="flex flex-col items-center gap-1.5 w-full mt-1">
            <Button
              variant="primary"
              size="md"
              onClick={handleHostForceReveal}
              className="w-full text-sm font-bold shadow-md rounded-2xl"
            >
              Reveal Winner Now
            </Button>
            <span className="text-[11px] text-[var(--text-tertiary)] text-center">
              Ready? You can reveal the top pick for everyone right away.
            </span>
          </div>
        ) : (
          <div className="p-3 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] mt-1 w-full text-center font-medium">
            Sit tight! Once everyone finishes, the winning spot will reveal automatically.
          </div>
        )}
      </div>
    </main>
  );
}
