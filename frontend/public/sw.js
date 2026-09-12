// Service worker placeholder to prevent 404/500 errors from legacy localhost service workers
self.addEventListener('install', () => {
  self.skipWaiting();
});
self.addEventListener('activate', () => {
  self.clients.claim();
});
