import React from 'react';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught error]', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-[var(--bg-root)] text-[var(--text-primary)] select-none">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-main)] shadow-xl flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-500 flex items-center justify-center">
              <AlertCircle size={26} strokeWidth={2.2} />
            </div>

            <div className="flex flex-col gap-1">
              <h2 className="text-base font-extrabold tracking-tight">Something went wrong</h2>
              <p className="text-xs text-[var(--text-secondary)]">
                The view encountered an unexpected issue. You can reload the page or return to the lobby.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-2.5 px-3 rounded-2xl bg-[var(--accent-bg)] hover:bg-[var(--accent-bg-hover)] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>Reload</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="flex-1 py-2.5 px-3 rounded-2xl bg-[var(--bg-inset)] hover:bg-black/5 dark:hover:bg-white/5 border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
              >
                <Home size={14} />
                <span>Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
