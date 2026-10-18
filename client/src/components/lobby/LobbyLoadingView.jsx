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
    <div className="flex-1 flex flex-col min-h-[100dvh] pb-28 select-none bg-[var(--bg-root)] animate-fade-in text-[var(--text-primary)]">
      {/* Header matching RoomLobby */}
      <header className="sticky top-0 z-30 bg-[var(--bg-root)] border-b border-[var(--border-main)] px-4 pt-[max(env(safe-area-inset-top,0px),0.75rem)] pb-3">
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
      <main className="px-4 pt-3.5 flex flex-col gap-3.5 flex-1 max-w-md mx-auto w-full">
        {/* Roster Card Skeleton */}
        <div className="p-4 sm:p-5 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-main)] flex flex-col gap-3.5 shadow-2xs">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1 min-w-0">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-bg)]">
                {isCustom ? <Layers size={13} /> : <Compass size={13} className="animate-spin" />}
                <span>{isCustom ? 'Custom Poll' : category}</span>
              </span>
              <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight line-clamp-1">
                {topic}
              </h2>
            </div>

            <div className="w-10 h-10 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
              <Loader2 size={18} className="animate-spin text-[var(--accent-bg)]" />
            </div>
          </div>

          {locationLabel && !isCustom && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-inset)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-secondary)]">
              <MapPin size={12} className="text-amber-500 shrink-0" />
              <span className="truncate">{locationLabel}</span>
            </div>
          )}

          {/* Host Participant Pill */}
          <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[var(--accent-bg)] text-white text-xs font-bold flex items-center justify-center shadow-xs">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <span>{userName}</span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-[var(--accent-bg)]/15 text-[var(--accent-bg)]">
                    Host
                  </span>
                </span>
                <span className="text-[11px] text-[var(--text-tertiary)] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                  {isCustom ? 'Preparing room sync...' : 'Scanning 1km hex grid...'}
                </span>
              </div>
            </div>

            <div className="h-7 w-20 rounded-full bg-[var(--bg-inset)] border border-[var(--border-subtle)] animate-pulse" />
          </div>
        </div>

        {/* Step Zero Budget Vault Shimmer (Discovery mode only) */}
        {!isCustom && (
          <div className="p-3.5 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-main)] flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2">
              <Shield size={15} className="text-[var(--accent-bg)]" />
              <span className="text-xs font-bold text-[var(--text-primary)]">Price Filter</span>
            </div>
            <div className="h-6 w-32 rounded-full bg-[var(--bg-inset)] animate-pulse" />
          </div>
        )}

        {/* Places / Options on the Table Skeleton */}
        <section className="p-4 sm:p-5 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-main)] flex flex-col gap-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LayoutGrid size={16} className="text-[var(--accent-bg)]" />
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                {isCustom ? 'Options on the Table (Preparing...)' : 'Places on the Table (Finding spots...)'}
              </h3>
            </div>
            <div className="h-5 w-16 rounded-full bg-[var(--bg-inset)] animate-pulse" />
          </div>

          {/* 6 Shimmering Skeleton Cards in exact 2-column grid */}
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="rounded-2xl overflow-hidden bg-[var(--bg-inset)] border border-[var(--border-subtle)] flex flex-col justify-between shadow-2xs text-left animate-pulse"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {/* Photo Skeleton Block */}
                <div className="relative h-32 sm:h-36 w-full bg-zinc-200/60 dark:bg-zinc-800/60 flex flex-col justify-between p-2.5">
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-12 rounded-full bg-white/40 dark:bg-white/10" />
                    <div className="h-4 w-7 rounded-full bg-white/40 dark:bg-white/10" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-3.5 bg-white/60 dark:bg-white/20 rounded-md w-3/4" />
                    <div className="h-2.5 bg-white/40 dark:bg-white/10 rounded-md w-1/2" />
                  </div>
                </div>

                {/* Footer Metadata Skeleton */}
                <div className="p-2.5 flex flex-col gap-1.5">
                  <div className="h-2.5 bg-zinc-300/70 dark:bg-zinc-700/60 rounded-md w-2/3" />
                  <div className="h-2 bg-zinc-200/80 dark:bg-zinc-800/80 rounded-md w-4/5" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Fixed Bottom Action Bar Skeleton */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-[var(--bg-root)]/95 backdrop-blur-md border-t border-[var(--border-main)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="max-w-md mx-auto">
          <div className="w-full h-13 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-main)] flex items-center justify-center gap-2 text-sm font-semibold text-[var(--text-tertiary)] animate-pulse">
            <Loader2 size={16} className="animate-spin text-[var(--accent-bg)]" />
            <span>{isCustom ? 'Setting up Consensus Room...' : 'Finding local spots in 1km hex grid...'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
