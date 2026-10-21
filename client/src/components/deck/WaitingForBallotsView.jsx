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
    <main className="px-4 py-8 flex flex-col items-center justify-center text-center flex-1 my-auto max-w-md mx-auto w-full animate-[modalSpring_0.35s_var(--spring-smooth)]">
      <div className="w-full rounded-3xl bg-[var(--bg-elevated)] p-8 border border-[var(--border-main)] flex flex-col items-center gap-5 shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-[0_8px_24px_rgba(16,185,129,0.35)] animate-pulse">
          <CheckCircle2 size={32} />
        </div>

        <div className="flex flex-col gap-1">
          <h3 className="text-xl font-black text-[var(--text-primary)]">
            You're All Done!
          </h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Waiting for your friends to finish swiping...
          </p>
        </div>

        <div className="w-full flex flex-col gap-2">
          <div className="flex justify-between text-xs font-semibold text-[var(--text-secondary)]">
            <span>Group Progress</span>
            <span className="font-bold tabular-nums text-[var(--text-primary)]">
              {votesReceived} of {quorumTotal} finished
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-[var(--bg-inset)] overflow-hidden">
            <div
              className="h-full bg-[var(--accent-bg)] transition-all duration-300 rounded-full"
              style={{ width: `${Math.min(100, (votesReceived / Math.max(1, quorumTotal)) * 100)}%` }}
            />
          </div>
        </div>

        {isHost ? (
          <div className="flex flex-col items-center gap-2 w-full mt-2">
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
          <div className="p-3.5 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] mt-2 w-full text-center font-medium">
            Sit tight! Once everyone finishes, the winning spot will reveal automatically.
          </div>
        )}
      </div>
    </main>
  );
}
