import { createContext, useContext, useEffect, useState } from 'react';

export const ACCENTS = [
  { id: 'coral', name: 'Coral', color: '#F04D3E', hover: '#D93828', glow: 'rgba(240, 77, 62, 0.28)' },
  { id: 'violet', name: 'Violet', color: '#8B5CF6', hover: '#7C3AED', glow: 'rgba(139, 92, 246, 0.28)' },
  { id: 'emerald', name: 'Emerald', color: '#10B981', hover: '#059669', glow: 'rgba(16, 185, 129, 0.28)' },
  { id: 'blue', name: 'Blue', color: '#3B82F6', hover: '#2563EB', glow: 'rgba(59, 130, 246, 0.28)' },
  { id: 'amber', name: 'Amber', color: '#F59E0B', hover: '#D97706', glow: 'rgba(245, 158, 11, 0.28)' },
];

export const APPEARANCE_MODES = [
  { id: 'dark', name: 'Dark' },
  { id: 'light', name: 'Light' },
  { id: 'system', name: 'System' },
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

    // Synchronized 300ms theme transition across all surfaces, text, and borders
    root.classList.add('theme-transitioning');

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
      meta.setAttribute('content', willBeDark ? '#111113' : '#fafafa');
    }

    setTimeout(() => {
      root.classList.remove('theme-transitioning');
    }, 320);
  };

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
