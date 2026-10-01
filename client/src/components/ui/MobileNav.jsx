import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { KeyRound, Sparkles, Users, Layers, Trophy } from 'lucide-react';

export default function MobileNav() {
  const location = useLocation();
  const navigate = useNavigate();

  // Extract active PIN from route params or fallback to localStorage
  const pinMatch = location.pathname.match(/\/(lobby|deck)\/([^/]+)/);
  const currentPin = pinMatch ? pinMatch[2] : (localStorage.getItem('consensus_active_pin') || '');

  const navItems = [
    {
      id: 'join',
      label: 'Join',
      path: '/',
      icon: KeyRound,
      isActive: location.pathname === '/',
    },
    {
      id: 'host',
      label: 'Host',
      path: '/host',
      icon: Sparkles,
      isActive: location.pathname === '/host',
    },
    {
      id: 'lobby',
      label: 'Lobby',
      path: currentPin ? `/lobby/${currentPin}` : '/host',
      icon: Users,
      isActive: location.pathname.startsWith('/lobby/'),
      badge: currentPin ? currentPin : null,
    },
    {
      id: 'deck',
      label: 'Arena',
      path: currentPin ? `/deck/${currentPin}` : '/',
      icon: Layers,
      isActive: location.pathname.startsWith('/deck/'),
    },
    {
      id: 'history',
      label: 'History',
      path: '/history',
      icon: Trophy,
      isActive: location.pathname === '/history',
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 max-w-[480px] mx-auto px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2"
      aria-label="Mobile Navigation Dock"
    >
      <div className="glass-surface rounded-2xl px-2 py-1.5 flex items-center justify-around shadow-[0_12px_32px_rgba(0,0,0,0.2)] border border-[var(--border-glass)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.isActive;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.path)}
              className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 cursor-pointer min-w-[56px] min-h-[44px] ${
                active
                  ? 'text-[var(--accent-bg)] font-bold'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] font-medium'
              }`}
            >
              {/* Active Kowalski Spring Glow Pill */}
              {active && (
                <span className="absolute inset-0 bg-[var(--accent-bg)]/10 rounded-xl border border-[var(--accent-bg)]/20 -z-10 animate-[stampPop_0.2s_ease-out]" />
              )}

              <div className="relative">
                <Icon size={19} strokeWidth={active ? 2.5 : 2} />
                {item.badge && !active && (
                  <span className="absolute -top-1 -right-2 px-1 py-0.2 bg-[var(--accent-bg)] text-white text-[9px] font-mono font-bold rounded-full leading-tight">
                    {item.badge}
                  </span>
                )}
              </div>

              <span className="text-[10px] mt-1 tracking-tight leading-none">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
