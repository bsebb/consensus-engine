import React from 'react';
import { Copy, Check, Users, ShieldCheck, Share2, Crown, QrCode } from 'lucide-react';

export default function LobbyRoster({
  pin,
  topic,
  participants = [],
  copied,
  handleCopyPin,
  handleShareInvite,
  setQrModalOpen,
}) {
  return (
    <section className="p-5 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-main)] flex flex-col gap-4 shadow-sm">
      {/* Top Row: Room Code + Actions */}
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
        <div className="flex flex-col">
          <span className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
            Room Code
          </span>
          <span className="text-3xl font-black text-[var(--accent-bg)] tracking-wide tabular-nums mt-0.5">
            {pin}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setQrModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[var(--accent-bg)]/10 hover:bg-[var(--accent-bg)]/20 text-xs font-bold text-[var(--accent-bg)] border border-[var(--accent-bg)]/20 transition-all cursor-pointer"
            title="Show QR Code"
          >
            <QrCode size={14} />
            <span>QR</span>
          </button>
          <button
            type="button"
            onClick={handleCopyPin}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[var(--bg-inset)] hover:bg-black/10 dark:hover:bg-white/10 text-xs font-bold text-[var(--text-primary)] border border-[var(--border-subtle)] transition-all cursor-pointer"
          >
            {copied ? <Check size={14} className="text-[var(--status-success)]" /> : <Copy size={14} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button
            type="button"
            onClick={handleShareInvite}
            className="p-2.5 rounded-full bg-[var(--bg-inset)] hover:bg-black/10 dark:hover:bg-white/10 text-[var(--text-secondary)] border border-[var(--border-subtle)] transition-all cursor-pointer"
            title="Share Invite"
          >
            <Share2 size={16} />
          </button>
        </div>
      </div>

      {/* Target Cuisine Topic */}
      <div className="flex flex-col gap-1 text-left">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
          Deciding on
        </span>
        <h2 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight">
          {topic}
        </h2>
      </div>

      {/* Friends Roster */}
      <div className="flex flex-col gap-2.5 pt-1">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
            <Users size={15} className="text-[var(--accent-bg)]" />
            <span>Friends in Room</span>
          </div>
          <span className="text-[var(--text-secondary)] font-medium tabular-nums">
            {participants.length} {participants.length === 1 ? 'person' : 'people'} ready
          </span>
        </div>

        {/* Avatar Chips */}
        <div className="flex flex-wrap gap-2">
          {participants.map((p, idx) => (
            <div
              key={p.id || idx}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-inset)] border border-[var(--border-subtle)]"
            >
              <div className="w-5 h-5 rounded-full bg-[var(--accent-bg)] text-white text-[10px] font-bold flex items-center justify-center">
                {(p.name || 'P').charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-medium text-[var(--text-primary)]">
                {p.name}
              </span>
              {p.isHost && (
                <Crown size={12} className="text-amber-400 fill-amber-400" title="Room Host" />
              )}
              {p.budgetSealed && (
                <ShieldCheck size={13} className="text-emerald-500 shrink-0" title="Budget Set Privately" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
