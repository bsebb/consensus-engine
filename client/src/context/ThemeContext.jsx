import { createContext, useContext, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

export const ACCENTS = [
  { id: 'coral', name: 'Flame Coral', color: '#F04D3E', hover: '#D93828', glow: 'rgba(240, 77, 62, 0.28)' },
  { id: 'violet', name: 'Cyber Violet', color: '#8B5CF6', hover: '#7C3AED', glow: 'rgba(139, 92, 246, 0.28)' },
  { id: 'emerald', name: 'Neon Mint', color: '#10B981', hover: '#059669', glow: 'rgba(16, 185, 129, 0.28)' },
  { id: 'blue', name: 'Ocean Sapphire', color: '#3B82F6', hover: '#2563EB', glow: 'rgba(59, 130, 246, 0.28)' },
  { id: 'amber', name: 'Sunset Gold', color: '#F59E0B', hover: '#D97706', glow: 'rgba(245, 158, 11, 0.28)' },
];

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('app-theme') || 'system';
  });

  const [accent, setAccentState] = useState(() => {
    return localStorage.getItem('app-accent') || 'coral';
  });

  const [isDark, setIsDark] = useState(() => {
    const root = typeof document !== 'undefined' ? document.documentElement : null;
    return root ? root.classList.contains('dark') : false;
  });

  // Listen for system preference changes when in 'system' mode
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      if (theme === 'system') {
        changeTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, [theme]);

  // Apply accent color CSS variables
  useEffect(() => {
    const root = document.documentElement;
    const target = ACCENTS.find((a) => a.id === accent) || ACCENTS[0];
    root.style.setProperty('--accent-bg', target.color);
    root.style.setProperty('--accent-bg-hover', target.hover);
    root.style.setProperty('--accent-glow', target.glow);
    root.style.setProperty('--accent-glow-hover', target.glow);
    localStorage.setItem('app-accent', accent);
  }, [accent]);

  const setAccent = (newAccent) => {
    if (ACCENTS.some((a) => a.id === newAccent)) {
      setAccentState(newAccent);
    }
  };

  const changeTheme = (newTheme) => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const willBeDark = newTheme === 'dark' || (newTheme === 'system' && mediaQuery.matches);

    const updateDOM = () => {
      root.classList.add('theme-switching');
      setTheme(newTheme);
      setIsDark(willBeDark);
      if (willBeDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      localStorage.setItem('app-theme', newTheme);
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) {
        meta.setAttribute('content', willBeDark ? '#111113' : '#f7f5f0');
      }
    };

    const hasActiveModal = typeof document !== 'undefined' && Boolean(
      document.querySelector('[role="dialog"]') ||
      document.querySelector('.modal-backdrop-ios')
    );

    if (!hasActiveModal && typeof document !== 'undefined' && document.startViewTransition) {
      const transition = document.startViewTransition(() => {
        flushSync(updateDOM);
      });
      const cleanup = () => {
        root.classList.remove('theme-switching');
      };
      if (transition && transition.finished) {
        transition.finished.finally(cleanup);
      } else {
        setTimeout(cleanup, 260);
      }
      return;
    }

    flushSync(() => {
      updateDOM();
    });
    // Force synchronous reflow so all styles paint in one single unified frame
    void root.offsetHeight;
    setTimeout(() => {
      root.classList.remove('theme-switching');
    }, 120);
  };

  const toggleTheme = () => {
    changeTheme(isDark ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark,
        toggleTheme,
        setTheme: changeTheme,
        accent,
        setAccent,
        ACCENTS,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
