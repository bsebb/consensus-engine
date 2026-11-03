import React from 'react';
import { LayoutGrid, MapPin, Loader2, Compass, Layers, Shield } from 'lucide-react';
import ThemeToggle from '../ThemeToggle';
import BrandLogo from '../ui/BrandLogo';
import { useLanguage } from '../../context/LanguageContext';

export default function LobbyLoadingView({
  topic = 'Where should we go?',
  category = 'Restaurants',
  userName = 'Host',
  locationLabel = '',
  isCustom = false,
  onCancel,
}) {
  const { t } = useLanguage();

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden select-none bg-[var(--bg-root)] animate-fade-in text-[var(--text-primary)]">
      {/* Header matching LobbyHeader */}
      <header className="sticky top-0 z-30 bg-[var(--bg-root)] border-b border-[var(--border-main)] px-3.5 sm:px-4 md:px-6 safe-pt-header pb-2 shrink-0">
        <div className="relative flex items-center justify-between max-w-md md:max-w-6xl mx-auto min-h-[40px]">
          <div className="flex items-center z-10">
            {onCancel ? (
              <button
                type="button"
                onClick={onCancel}
                className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer py-1.5 px-3 rounded-full bg-[var(--bg-surface)] border border-[var(--border-main)] active:scale-[0.96]"
                aria-label="Cancel and return home"
              >
                <span>{t('back')}</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#0F1422] to-[#05070B] border border-white/10 flex items-center justify-center shadow-xs overflow-hidden p-0.5">
                  <BrandLogo size={18} />
                </div>
                <span className="font-bold text-sm tracking-tight">{t('brand')}</span>
              </div>
            )}
          </div>

          <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-main)] text-xs font-bold text-[var(--text-primary)] z-10 pointer-events-none shadow-2xs">
            <span className="text-[var(--text-tertiary)] font-normal">{t('code')}</span>
            <span className="text-[var(--accent-bg)] tracking-widest animate-pulse tabular-nums font-bold">••••</span>
          </div>

          <div className="flex items-center gap-1.5 z-10">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content matching RoomLobby 2-Column Responsive Architecture */}
      <main className="w-full flex-1 min-h-0 overflow-y-auto overscroll-contain no-scrollbar px-3.5 sm:px-4 md:px-6 pt-3 pb-32">
        <div className="max-w-md md:max-w-6xl mx-auto w-full flex flex-col lg:flex-row gap-4 lg:gap-6 items-start">
          {/* Left Column: Roster + Budget Vault Skeleton */}
          <aside className={`w-full grid grid-cols-1 ${!isCustom ? 'md:grid-cols-2 lg:grid-cols-1' : ''} lg:w-[330px] xl:w-[350px] shrink-0 gap-3.5`}>
            <div className="p-3.5 sm:p-4 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-main)] flex flex-col gap-3 shadow-2xs">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-bg)]">
                    {isCustom ? <Layers size={13} /> : <Compass size={13} className="animate-spin" />}
                    <span>{isCustom ? t('catCustom') : category}</span>
                  </span>
                  <h2 className="text-lg sm:text-xl font-black text-[var(--text-primary)] tracking-tight line-clamp-1">
                    {topic}
                  </h2>
                </div>

                <div className="w-9 h-9 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
                  <Loader2 size={16} className="animate-spin text-[var(--accent-bg)]" />
                </div>
              </div>

              {locationLabel && !isCustom && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-inset)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-secondary)]">
                  <MapPin size={12} className="text-amber-500 shrink-0" />
                  <span className="truncate">{locationLabel}</span>
                </div>
              )}

              <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-[var(--accent-bg)] text-white text-xs font-bold flex items-center justify-center shadow-xs">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                      <span>{userName}</span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--accent-bg)]/15 text-[var(--accent-bg)]">
                        {t('hostBadge')}
                      </span>
                    </span>
                    <span className="text-[11px] text-[var(--text-tertiary)] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                      <span>{t('ready') || 'Ready'}</span>
                    </span>
                  </div>
                </div>

                <div className="h-6 w-20 rounded-full bg-[var(--bg-inset)] border border-[var(--border-subtle)] animate-pulse" />
              </div>
            </div>

            {!isCustom && (
              <div className="p-3.5 sm:p-4 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-main)] flex flex-col justify-between gap-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield size={15} className="text-[var(--accent-bg)]" />
                    <span className="text-xs font-bold text-[var(--text-primary)]">{t('priceFilter')}</span>
                  </div>
                  <div className="h-5 w-20 rounded-full bg-[var(--bg-inset)] animate-pulse" />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 1, 2, 3].map((idx) => (
                    <div key={idx} className="h-9 rounded-xl bg-[var(--bg-inset)] border border-[var(--border-subtle)] animate-pulse" />
                  ))}
                </div>
              </div>
            )}
          </aside>

          {/* Right Column: Candidate Pool Deck Skeleton */}
          <section className="w-full flex-1 min-w-0 p-3.5 sm:p-5 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-main)] flex flex-col gap-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LayoutGrid size={16} className="text-[var(--accent-bg)]" />
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  {isCustom ? `${t('optionsOnTable')}...` : `${t('placesOnTable')}...`}
                </h3>
              </div>
              <div className="h-6 w-24 rounded-full bg-[var(--bg-inset)] animate-pulse" />
            </div>

            <div className="h-10 w-full rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)] animate-pulse" />

            <div className={isCustom ? 'grid grid-cols-2 xl:grid-cols-3 gap-3 md:gap-3.5' : 'places-rail md:grid md:grid-cols-2 xl:grid-cols-3 md:gap-3.5 no-scrollbar'}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl overflow-hidden bg-[var(--bg-inset)] border border-[var(--border-subtle)] flex flex-col justify-between shadow-2xs text-left animate-pulse"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="relative aspect-[16/10] w-full bg-zinc-200/60 dark:bg-zinc-800/60 flex flex-col justify-between p-2.5">
                    <div className="flex items-center justify-between">
                      <div className="h-4 w-12 rounded-full bg-white/40 dark:bg-white/10" />
                      <div className="h-4 w-7 rounded-full bg-white/40 dark:bg-white/10" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-3.5 bg-white/60 dark:bg-white/20 rounded-md w-3/4" />
                      <div className="h-2.5 bg-white/40 dark:bg-white/10 rounded-md w-1/2" />
                    </div>
                  </div>

                  <div className="p-3 flex flex-col gap-1.5 flex-1 justify-between min-h-[84px]">
                    <div className="h-3 bg-zinc-300/70 dark:bg-zinc-700/60 rounded-md w-4/5" />
                    <div className="h-2.5 bg-zinc-200/80 dark:bg-zinc-800/80 rounded-md w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* Floating Bottom Dock matching LobbyDock */}
      <div className="fixed bottom-0 inset-x-0 p-3 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-[var(--bg-root)] via-[var(--bg-root)]/95 to-transparent pointer-events-none z-30">
        <div className="max-w-md md:max-w-xl mx-auto pointer-events-auto">
          <div className="w-full h-13 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-main)] flex items-center justify-center gap-2.5 text-xs sm:text-sm font-semibold text-[var(--text-secondary)] shadow-lg">
            <Loader2 size={16} className="animate-spin text-[var(--accent-bg)] shrink-0" />
            <span className="truncate">
              {isCustom
                ? (t('preparingPoll') || 'Preparing poll options...')
                : (t('preparingTable') || 'Setting up your table...')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
