const CACHE_NAME = "thaihelp-plus-v5";
const urlsToCache = [
    "./",
    "./index.html",
    "./manifest.json",
    "./assets/css/style.css",
    "./assets/js/app.js",
    "./assets/js/charts.js",
    "./assets/js/pwa.js",
    "https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css",
    "https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js",
    "https://cdn.jsdelivr.net/npm/chart.js"

];
/* ==========================================
   INSTALL
========================================== */

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(urlsToCache);
            })
    );
});

/* ==========================================
   ACTIVATE
========================================== */

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys()
            .then(keys => {
                return Promise.all(
                    keys.map(key => {
                        if (key !== CACHE_NAME) {
                            return caches.delete(key);
                        }
                    })
                );
            })
    );

});

/* ==========================================
   FETCH
========================================== */

self.addEventListener("fetch", event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                return response || fetch(event.request);
            })
    );
});