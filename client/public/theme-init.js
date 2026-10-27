(function() {
  try {
    var t = localStorage.getItem('app-theme') || 'system';
    var isDark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', isDark ? '#111113' : '#fafafa');

    var accents = {
      coral: { color: '#F04D3E', hover: '#D93828', glow: 'rgba(240, 77, 62, 0.28)', subtle: 'rgba(240, 77, 62, 0.12)', focus: 'rgba(240, 77, 62, 0.20)' },
      violet: { color: '#8B5CF6', hover: '#7C3AED', glow: 'rgba(139, 92, 246, 0.28)', subtle: 'rgba(139, 92, 246, 0.12)', focus: 'rgba(139, 92, 246, 0.20)' },
      emerald: { color: '#10B981', hover: '#059669', glow: 'rgba(16, 185, 129, 0.28)', subtle: 'rgba(16, 185, 129, 0.12)', focus: 'rgba(16, 185, 129, 0.20)' },
      blue: { color: '#3B82F6', hover: '#2563EB', glow: 'rgba(59, 130, 246, 0.28)', subtle: 'rgba(59, 130, 246, 0.12)', focus: 'rgba(59, 130, 246, 0.20)' },
      amber: { color: '#F59E0B', hover: '#D97706', glow: 'rgba(245, 158, 11, 0.28)', subtle: 'rgba(245, 158, 11, 0.12)', focus: 'rgba(245, 158, 11, 0.20)' }
    };
    var savedAccent = localStorage.getItem('app-accent') || 'coral';
    var acc = accents[savedAccent] || accents.coral;
    var root = document.documentElement;
    root.style.setProperty('--accent-bg', acc.color);
    root.style.setProperty('--accent-bg-hover', acc.hover);
    root.style.setProperty('--accent-glow', acc.glow);
    root.style.setProperty('--accent-glow-hover', acc.glow);
    root.style.setProperty('--accent-glow-subtle', acc.subtle);
    root.style.setProperty('--accent-glow-focus', acc.focus);
  } catch {}
})();
