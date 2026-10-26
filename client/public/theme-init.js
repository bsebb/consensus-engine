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
        } catch {}
      })();
