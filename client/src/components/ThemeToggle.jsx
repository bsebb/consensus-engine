import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle({ className = '' }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl p-2.5 bg-transparent transition-all duration-150 active:scale-95 ${
        isDark
          ? 'text-[#FF9500] hover:bg-white/10'
          : 'text-[#6E6E73] hover:text-black hover:bg-black/[0.06]'
      } ${className}`}
    >
      {isDark ? (
        <Sun className="w-5 h-5 transition-transform duration-200 rotate-0 pointer-events-none" />
      ) : (
        <Moon className="w-5 h-5 transition-transform duration-200 rotate-0 pointer-events-none" />
      )}
    </button>
  );
}
