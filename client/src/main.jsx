import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register PWA Service Worker for standalone installability & auto-updating
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('[PWA] Service Worker registered with scope:', reg.scope);
        // Force immediate check for sw updates
        return reg.update();
      })
      .catch((err) => {
        console.warn('[PWA] Service Worker registration failed:', err);
      });
  });

  // Automatically refresh when a new Service Worker takes over so users receive updates immediately
  let refreshing = false;
  let hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) { hadController = true; return; }
    // Preserve the active room and swipe progress; apply code updates on the next visit.
    if (/^\/(lobby|deck)\//.test(window.location.pathname)) return;
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}
