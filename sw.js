// ══════════════════════════════════════
// منظومة — Service Worker
// Offline-first PWA
// ══════════════════════════════════════

var CACHE_NAME = 'manzuma-v1';
var OFFLINE_URLS = [
  './',
  './index.html'
];

// Install — cache the app
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(OFFLINE_URLS);
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Fetch — serve from cache, fallback to network
self.addEventListener('fetch', function(e) {
  // Don't cache Supabase API calls
  if (e.request.url.includes('supabase.co')) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(response) {
        // Cache successful GET requests
        if (e.request.method === 'GET' && response.status === 200) {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, copy);
          });
        }
        return response;
      }).catch(function() {
        // Offline fallback
        return caches.match('./index.html');
      });
    })
  );
});

// Background sync (when back online)
self.addEventListener('sync', function(e) {
  if (e.tag === 'sync-data') {
    e.waitUntil(
      self.clients.matchAll().then(function(clients) {
        clients.forEach(function(client) {
          client.postMessage({ type: 'SYNC_NOW' });
        });
      })
    );
  }
});
