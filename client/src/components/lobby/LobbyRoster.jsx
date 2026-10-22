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
    <section className="shrink-0 p-2.5 sm:p-3.5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-main)] flex flex-col gap-2 shadow-2xs">
      {/* Topic & Invite Bar */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--border-subtle)]">
        <div className="flex flex-col text-left min-w-0">
          <h2 className="text-sm sm:text-base font-black text-[var(--text-primary)] tracking-tight leading-tight truncate">
            {topic}
          </h2>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setQrModalOpen(true)}
            className="w-7 h-7 rounded-full bg-[var(--bg-inset)] hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] transition-colors cursor-pointer"
            title="Show QR Code"
            aria-label="Show QR Code"
          >
            <QrCode size={13} />
          </button>
          <button
            type="button"
            onClick={handleCopyPin}
            className="flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--bg-inset)] hover:bg-black/5 dark:hover:bg-white/5 text-[11px] font-semibold text-[var(--text-primary)] border border-[var(--border-subtle)] transition-colors cursor-pointer"
            title="Copy Room Code"
          >
            {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
            <span className="tabular-nums">{copied ? 'Copied' : pin}</span>
          </button>
          <button
            type="button"
            onClick={handleShareInvite}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--accent-bg)] text-white hover:opacity-90 text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
            title="Invite Friends"
          >
            <Share2 size={12} />
            <span>Invite</span>
          </button>
        </div>
      </div>

      {/* Horizontal Scrollable Friends Roster Strip (Never wraps or expands vertically) */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1 text-[11px] font-semibold text-[var(--text-secondary)] shrink-0">
          <Users size={12} className="text-[var(--accent-bg)]" />
          <span>In Room ({participants.length}):</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {participants.map((p, idx) => (
            <div
              key={p.id || idx}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--bg-inset)] border border-[var(--border-subtle)] shrink-0"
            >
              <div className="w-3.5 h-3.5 rounded-full bg-[var(--accent-bg)] text-white text-[9px] font-bold flex items-center justify-center">
                {(p.name || 'P').charAt(0).toUpperCase()}
              </div>
              <span className="text-[11px] font-medium text-[var(--text-primary)] max-w-[90px] truncate">
                {p.name}
              </span>
              {p.isHost && (
                <Crown size={10} className="text-amber-500 fill-amber-500 shrink-0" title="Room Host" />
              )}
              {p.budgetSealed && (
                <ShieldCheck size={11} className="text-emerald-500 shrink-0" title="Price filter set" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
