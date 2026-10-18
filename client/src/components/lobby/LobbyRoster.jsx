import React from 'react';
import { Copy, Check, Users, ShieldCheck, Share2, Crown, QrCode } from 'lucide-react';

export default function LobbyRoster({
  pin,
  topic,
  participants = [],
  groupSize,
  sealedCount,
  copied,
  handleCopyPin,
  handleShareInvite,
  setQrModalOpen,
}) {
  return (
    <>
      {/* Hero PIN & Share Banner */}
      <section className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-main)] flex items-center justify-between shadow-sm">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
            Room Passkey
          </span>
          <span className="font-mono text-2xl font-black text-[var(--accent-bg)] tracking-widest mt-0.5">
            {pin}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setQrModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--accent-bg)]/10 hover:bg-[var(--accent-bg)]/20 text-xs font-bold text-[var(--accent-bg)] border border-[var(--accent-bg)]/20 transition-colors cursor-pointer"
            title="Show QR Code"
          >
            <QrCode size={14} />
            <span>QR</span>
          </button>
          <button
            type="button"
            onClick={handleCopyPin}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--bg-inset)] hover:bg-black/10 dark:hover:bg-white/10 text-xs font-bold text-[var(--text-primary)] border border-[var(--border-subtle)] transition-colors cursor-pointer"
          >
            {copied ? <Check size={14} className="text-[var(--status-success)]" /> : <Copy size={14} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button
            type="button"
            onClick={handleShareInvite}
            className="p-2 rounded-xl bg-[var(--bg-inset)] hover:bg-black/10 dark:hover:bg-white/10 text-[var(--text-secondary)] border border-[var(--border-subtle)] transition-colors cursor-pointer"
            title="Share Invite"
          >
            <Share2 size={16} />
          </button>
        </div>
      </section>

      {/* Active Target Banner */}
      <div className="px-1 flex flex-col">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
          Consensus Target
        </span>
        <h2 className="text-xl font-extrabold text-[var(--text-primary)] tracking-tight">
          {topic}
        </h2>
      </div>

      {/* Live Roll-Call Roster with Budget Sealed Indicators */}
      <section className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-main)] flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-[var(--accent-bg)]" />
            <span className="text-xs font-bold text-[var(--text-primary)]">
              Participant Quorum
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-mono font-semibold">
            <span className="text-[var(--text-secondary)] tabular-nums">
              {participants.length} / {groupSize} joined
            </span>
            <span className="text-[var(--text-tertiary)]">•</span>
            <span className="text-emerald-500 font-bold tabular-nums flex items-center gap-0.5">
              <ShieldCheck size={13} className="text-emerald-500" />
              {sealedCount} of {participants.length} sealed
            </span>
          </div>
        </div>

        {/* Avatar chips with Step Zero shield indicators */}
        <div className="flex flex-wrap gap-2 pt-1">
          {participants.map((p, idx) => (
            <div
              key={p.id || idx}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[var(--bg-inset)] border border-[var(--border-subtle)]"
            >
              <div className="w-5 h-5 rounded-full bg-[var(--accent-bg)] text-white text-[10px] font-bold flex items-center justify-center">
                {(p.name || 'P').charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-medium text-[var(--text-primary)]">
                {p.name}
              </span>
              {p.isHost && (
                <Crown size={12} className="text-[var(--status-warning)] fill-[var(--status-warning)]" />
              )}
              {p.budgetSealed && (
                <ShieldCheck size={13} className="text-emerald-500 shrink-0" title="Budget Sealed Anonymously" />
              )}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
