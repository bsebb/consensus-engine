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
      <aside aria-label="Notifications" className="fixed bottom-6 right-6 z-[2200] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => {
          const Icon = {
            success: CheckCircle2,
            warning: AlertTriangle,
            error: AlertCircle,
            info: Info,
          }[toast.type] || CheckCircle2;

          const iconColor = {
            success: 'text-[var(--semantic-success)]',
            warning: 'text-[var(--semantic-warning)]',
            error: 'text-[var(--semantic-error)]',
            info: 'text-[var(--semantic-info)]',
          }[toast.type] || 'text-[var(--semantic-success)]';

          return (
            <div
              key={toast.id}
              className="pointer-events-auto liquid-glass rounded-2xl p-4 shadow-[0_12px_36px_rgba(0,0,0,0.18)] border border-[var(--border-glass)] flex items-start gap-3 animate-[toastSlide_0.35s_var(--spring-smooth)] select-none"
            >
              <Icon size={20} className={`shrink-0 mt-0.5 ${iconColor}`} />
              <div className="flex-1 min-w-0">
                {toast.title && (
                  <h4 className="text-sm font-semibold text-[var(--ios-label)] leading-snug">
                    {toast.title}
                  </h4>
                )}
                {toast.message && (
                  <p className="text-xs text-[var(--ios-secondary-label)] mt-0.5 leading-relaxed">
                    {toast.message}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="shrink-0 p-1 text-[var(--ios-tertiary-label)] hover:text-[var(--ios-label)] rounded-lg transition-colors cursor-pointer"
              >
                <X size={14} />
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
