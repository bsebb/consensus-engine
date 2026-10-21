import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { triggerHaptic } from '../utils/haptics';

export default function ThemeToggle({ className = '' }) {
  const { isDark, toggleTheme } = useTheme();

  const handleToggle = () => {
    const nextDark = !isDark;
    // triggerHaptic('toggle') triggers iOS/Android tactile response and playThemeToggleSound
    triggerHaptic('toggle', { toDark: nextDark });
    toggleTheme();
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Switch to Light' : 'Switch to Dark'}
      title={isDark ? 'Switch to Light' : 'Switch to Dark'}
      onClick={handleToggle}
      className={`w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-bg)] shrink-0 ${className}`}
    >
      <span className="relative w-4 h-4 flex items-center justify-center pointer-events-none">
        {/* Sun icon (Light) */}
        <span
          aria-hidden="true"
          className={`absolute inset-0 flex items-center justify-center transition-all ${
            isDark
              ? 'scale-0 opacity-0 rotate-90 pointer-events-none'
              : 'scale-100 opacity-100 rotate-0'
          }`}
          style={{
            transitionDuration: '320ms',
            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <Sun size={16} strokeWidth={2} />
        </span>

        {/* Moon icon (Dark) */}
        <span
          aria-hidden="true"
          className={`absolute inset-0 flex items-center justify-center transition-all ${
            isDark
              ? 'scale-100 opacity-100 rotate-0'
              : 'scale-0 opacity-0 -rotate-90 pointer-events-none'
          }`}
          style={{
            transitionDuration: '320ms',
            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <Moon size={16} strokeWidth={2} />
        </span>
      </span>
    </button>
  );
}
