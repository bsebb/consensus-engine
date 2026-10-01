import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ title, message, type = 'success', duration = 3500 }) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Viewport-anchored Toast Stack */}
      <aside aria-label="Notifications" className="fixed bottom-20 right-4 z-[2200] flex flex-col gap-2 max-w-xs w-full pointer-events-none">
        {toasts.map((toast) => {
          const Icon = {
            success: CheckCircle2,
            warning: AlertTriangle,
            error: AlertCircle,
            info: Info,
          }[toast.type] || CheckCircle2;

          const iconColor = {
            success: 'text-[var(--status-success)]',
            warning: 'text-[var(--status-warning)]',
            error: 'text-[var(--status-danger)]',
            info: 'text-[var(--status-info)]',
          }[toast.type] || 'text-[var(--status-success)]';

          return (
            <div
              key={toast.id}
              className="pointer-events-auto glass-surface rounded-2xl p-3.5 shadow-[0_12px_32px_rgba(0,0,0,0.2)] border border-[var(--border-glass)] flex items-start gap-2.5 animate-[toastSlide_0.35s_var(--spring-smooth)] select-none"
            >
              <Icon size={18} className={`shrink-0 mt-0.5 ${iconColor}`} />
              <div className="flex-1 min-w-0">
                {toast.title && (
                  <h4 className="text-xs font-bold text-[var(--text-primary)] leading-snug">
                    {toast.title}
                  </h4>
                )}
                {toast.message && (
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                    {toast.message}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="shrink-0 p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] rounded-lg transition-colors cursor-pointer"
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
      </aside>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      addToast: ({ title, message }) => console.log(`[Toast] ${title}: ${message}`),
    };
  }
  return ctx;
}
