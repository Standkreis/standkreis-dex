// Registered from the first launch, caches nothing. Offline (M8) fills this in.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
