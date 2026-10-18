import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { triggerHaptic } from '../utils/haptics';

export default function ThemeToggle({ className = '' }) {
  const { isDark, toggleTheme } = useTheme();

  const handleToggle = () => {
    triggerHaptic('tap');
    toggleTheme();
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`w-8 h-8 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-full p-1.5 bg-transparent active:scale-95 cursor-pointer text-[#6E6E73] hover:text-black hover:bg-black/[0.06] dark:text-[#FF9500] dark:hover:bg-white/10 ${className}`}
    >
      <Sun className="w-5 h-5 hidden dark:block pointer-events-none" />
      <Moon className="w-5 h-5 block dark:hidden pointer-events-none" />
    </button>
  );
}
