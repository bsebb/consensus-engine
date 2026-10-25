const CACHE_NAME = 'noyoupick-pwa-v45';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/favicon.svg',
  '/apple-touch-icon.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Strictly ignore cross-origin requests (e.g. Render backend, external CDNs)
  if (url.origin !== self.location.origin) {
    return;
  }

  // Bypass non-GET requests, API routes, health checks, and websocket transports
  if (
    event.request.method !== 'GET' ||
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/health') ||
    url.pathname.includes('socket.io') ||
    url.pathname.startsWith('/@') || // Vite HMR internals in dev
    url.protocol.startsWith('ws')
  ) {
    return;
  }

  // Cache-First for immutable hashed assets (/assets/.*) for snappiest load times
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // For SPA document navigations (/lobby/1234, /deck/1234, /), serve network index.html with cached SPA fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          const fallback = (await caches.match('/index.html')) || (await caches.match('/'));
          if (fallback) return fallback;
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        })
    );
    return;
  }

  // Only intercept known static root files; let the browser handle everything else natively
  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        })
    );
  }
});

let reminderTimer = null;

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SCHEDULE_CHECKIN_REMINDER' && data.winnerName) {
    if (reminderTimer) clearTimeout(reminderTimer);
    const delayMs = Math.max(5000, Number(data.delayMs) || 90 * 60 * 1000);
    reminderTimer = setTimeout(() => {
      if (self.registration && self.registration.showNotification) {
        self.registration.showNotification(`How was ${data.winnerName}?`, {
          body: `Tap to leave a quick 1-tap rating for your group pick!`,
          icon: '/pwa-192x192.png',
          badge: '/favicon.ico',
          tag: `nyp-checkin-${data.pin || 'latest'}`,
          data: { url: `/?ratePin=${encodeURIComponent(data.pin || '')}` },
        }).catch(() => {});
      }
    }, delayMs);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl).catch(() => {});
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
