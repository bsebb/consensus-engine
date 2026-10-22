import React from 'react';
import { LayoutGrid, MapPin, Loader2, Compass, Layers, Shield } from 'lucide-react';
import ThemeToggle from '../ThemeToggle';
import BrandLogo from '../ui/BrandLogo';

export default function LobbyLoadingView({
  topic = 'Where should we go?',
  category = 'Restaurants',
  userName = 'Host',
  locationLabel = '',
  isCustom = false,
  onCancel,
}) {
  return (
    <div className="flex-1 h-full max-h-full flex flex-col justify-between overflow-hidden select-none bg-[var(--bg-root)] animate-fade-in text-[var(--text-primary)]">
      {/* Header matching RoomLobby */}
      <header className="shrink-0 z-30 bg-[var(--bg-root)] border-b border-[var(--border-main)] px-3.5 sm:px-4 safe-pt-header pb-2">
        <div className="flex items-center justify-between max-w-md mx-auto">
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer py-1.5 px-3 rounded-full bg-[var(--bg-surface)] border border-[var(--border-main)]"
              aria-label="Cancel and return home"
            >
              <span>Back</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#0F1422] to-[#05070B] border border-white/10 flex items-center justify-center shadow-xs overflow-hidden p-0.5">
                <BrandLogo size={18} />
              </div>
              <span className="font-bold text-sm tracking-tight">NoYouPick</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--bg-surface)] border border-[var(--border-main)] text-xs font-bold text-[var(--text-primary)]">
            <span className="text-[var(--text-tertiary)] font-normal">Code</span>
            <span className="text-[var(--accent-bg)] tracking-widest animate-pulse font-mono font-bold">••••</span>
          </div>

          <div className="flex items-center gap-1.5">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content matching RoomLobby */}
      <main className="px-3.5 sm:px-4 py-2 flex flex-col gap-2 flex-1 min-h-0 max-w-md mx-auto w-full overflow-hidden">
        {/* Roster Card Skeleton */}
        <div className="shrink-0 p-3 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-main)] flex flex-col gap-2 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[var(--accent-bg)]">
                {isCustom ? <Layers size={12} /> : <Compass size={12} className="animate-spin" />}
                <span>{isCustom ? 'Custom Poll' : category}</span>
              </span>
              <h2 className="text-base font-bold text-[var(--text-primary)] tracking-tight truncate">
                {topic}
              </h2>
            </div>

            <div className="w-8 h-8 rounded-xl bg-[var(--bg-inset)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
              <Loader2 size={15} className="animate-spin text-[var(--accent-bg)]" />
            </div>
          </div>

          {locationLabel && !isCustom && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[var(--bg-inset)] border border-[var(--border-subtle)] text-[11px] font-medium text-[var(--text-secondary)]">
              <MapPin size={11} className="text-amber-500 shrink-0" />
              <span className="truncate">{locationLabel}</span>
            </div>
          )}

          {/* Host Participant Pill */}
          <div className="pt-1.5 border-t border-[var(--border-subtle)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[var(--accent-bg)] text-white text-[11px] font-bold flex items-center justify-center shadow-xs">
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                <span>{userName}</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-[var(--accent-bg)]/15 text-[var(--accent-bg)]">
                  Host
                </span>
              </span>
            </div>

            <span className="text-[11px] text-[var(--text-tertiary)] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
              {isCustom ? 'Preparing room...' : 'Scanning hex grid...'}
            </span>
          </div>
        </div>

        {/* Step Zero Budget Vault Shimmer (Discovery mode only) */}
        {!isCustom && (
          <div className="shrink-0 p-2.5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-main)] flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-1.5">
              <Shield size={13} className="text-[var(--accent-bg)]" />
              <span className="text-xs font-bold text-[var(--text-primary)]">Price Filter</span>
            </div>
            <div className="h-5 w-28 rounded-full bg-[var(--bg-inset)] animate-pulse" />
          </div>
        )}

        {/* Places / Options on the Table Skeleton */}
        <section className="flex-1 min-h-0 p-3 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-main)] flex flex-col gap-2 shadow-2xs overflow-hidden">
          <div className="shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <LayoutGrid size={14} className="text-[var(--accent-bg)]" />
              <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                {isCustom ? 'Options on the Table (Preparing...)' : 'Places on the Table (Finding spots...)'}
              </h3>
            </div>
            <div className="h-4 w-14 rounded-full bg-[var(--bg-inset)] animate-pulse" />
          </div>

          {/* 4 Shimmering Skeleton Cards fitting locked viewport */}
          <div className="flex-1 min-h-0 grid grid-cols-2 gap-2.5 overflow-hidden">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-2xl overflow-hidden bg-[var(--bg-inset)] border border-[var(--border-subtle)] flex flex-col justify-between shadow-2xs text-left animate-pulse"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="relative flex-1 min-h-[84px] w-full bg-zinc-200/60 dark:bg-zinc-800/60 flex flex-col justify-between p-2">
                  <div className="flex items-center justify-between">
                    <div className="h-3.5 w-10 rounded-full bg-white/40 dark:bg-white/10" />
                    <div className="h-3.5 w-6 rounded-full bg-white/40 dark:bg-white/10" />
                  </div>
                  <div className="space-y-1">
                    <div className="h-3 bg-white/60 dark:bg-white/20 rounded-md w-3/4" />
                  </div>
                </div>

                <div className="px-2.5 py-1.5 flex flex-col gap-1 shrink-0">
                  <div className="h-2.5 bg-zinc-300/70 dark:bg-zinc-700/60 rounded-md w-2/3" />
                  <div className="h-2 bg-zinc-200/80 dark:bg-zinc-800/80 rounded-md w-4/5" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Bottom Action Bar Skeleton */}
      <div className="shrink-0 z-30 bg-[var(--bg-root)]/95 backdrop-blur-md border-t border-[var(--border-main)] px-3.5 sm:px-4 pt-2 pb-[max(0.65rem,env(safe-area-inset-bottom))]">
        <div className="max-w-md mx-auto">
          <div className="w-full h-11 sm:h-12 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-main)] flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold text-[var(--text-tertiary)] animate-pulse">
            <Loader2 size={15} className="animate-spin text-[var(--accent-bg)]" />
            <span>{isCustom ? 'Setting up Consensus Room...' : 'Finding local spots in 1km hex grid...'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
