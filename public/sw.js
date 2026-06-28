const CACHE_NAME = "cookillers-v2-cache-v1";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./mascotte_logo_app.png"
];

// Installation du Service Worker et mise en cache des ressources de base
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activation et nettoyage des anciens caches
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interception des requêtes : Stratégie Cache-First avec Network Fallback pour les assets statiques,
// et Network-Only pour Supabase API/Realtime.
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  
  // Ne pas intercepter les requêtes vers Supabase ou les WebSockets
  if (url.origin.includes("supabase.co") || e.request.url.includes("supabase")) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(e.request).then((networkResponse) => {
        // Mettre en cache les nouveaux assets statiques du même domaine
        if (e.request.method === "GET" && networkResponse.status === 200 && url.origin === self.location.origin) {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, networkResponse.clone());
            return networkResponse;
          });
        }
        return networkResponse;
      }).catch(() => {
        // En cas d'échec total (offline), on essaie de retourner l'index.html
        if (e.request.mode === "navigate") {
          return caches.match("./index.html");
        }
      });
    })
  );
});
