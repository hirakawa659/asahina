// Hirakawa - Minimal Service Worker Stub
self.addEventListener('install', () => {
  console.log('[ServiceWorker] Installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activated');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  // Stub for future offline caching
});
