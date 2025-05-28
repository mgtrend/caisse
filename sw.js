// sw.js - Service Worker optimisé
const CACHE_NAME = 'mg-caisse-v1.1'; // Increment version for updates
const urlsToCache = [
    '/', // Cache the root/index.php
    '/index.php', // Explicitly cache index.php
    '/assets/css/style.min.css',
    '/assets/js/app.min.js',
    '/manifest.json',
    // Add placeholder icon paths if you have them
    // '/assets/img/icon-192.png',
    // '/assets/img/icon-512.png',
    'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css' // Cache external CDN resource
];

// Install event: Cache core assets
self.addEventListener('install', event => {
    console.log('[Service Worker] Install');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[Service Worker] Caching core assets');
                // Use addAll for atomic caching
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting()) // Activate worker immediately
    );
});

// Activate event: Clean up old caches
self.addEventListener('activate', event => {
    console.log('[Service Worker] Activate');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] Removing old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Take control of open clients
    );
});

// Fetch event: Serve from cache or network (Cache-first strategy for core assets)
self.addEventListener('fetch', event => {
    // console.log('[Service Worker] Fetching:', event.request.url);
    
    // For API requests, always go to the network first, maybe cache later if needed (Network falling back to cache or specific offline handling)
    if (event.request.url.includes('/api/')) {
        // console.log('[Service Worker] API request, going network first:', event.request.url);
        event.respondWith(
            fetch(event.request).catch(error => {
                console.error('[Service Worker] API fetch failed:', error);
                // Optionally return a generic error response for API calls when offline
                return new Response(JSON.stringify({ error: 'Offline: Impossible de contacter l\'API' }), {
                    headers: { 'Content-Type': 'application/json' },
                    status: 503, // Service Unavailable
                    statusText: 'Service Unavailable (Offline)'
                });
            })
        );
        return; // Don't process API requests further with cache-first
    }

    // For other requests (core assets, CDN, etc.), use Cache-first strategy
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    // console.log('[Service Worker] Returning from cache:', event.request.url);
                    return cachedResponse;
                }
                
                // console.log('[Service Worker] Not in cache, fetching from network:', event.request.url);
                return fetch(event.request).then(
                    response => {
                        // Check if we received a valid response
                        if (!response || response.status !== 200 || response.type !== 'basic' && response.type !== 'cors') {
                            return response;
                        }

                        // IMPORTANT: Clone the response. A response is a stream
                        // and because we want the browser to consume the response
                        // as well as the cache consuming the response, we need
                        // to clone it so we have two streams.
                        var responseToCache = response.clone();

                        // Cache the fetched resource if it's one of the core assets or CDN
                        // Be careful not to cache everything unintendedly
                        if (urlsToCache.includes(event.request.url) || event.request.url.startsWith('https://cdn.jsdelivr.net/')) {
                             caches.open(CACHE_NAME)
                                .then(cache => {
                                    // console.log('[Service Worker] Caching new resource:', event.request.url);
                                    cache.put(event.request, responseToCache);
                                });
                        }

                        return response;
                    }
                ).catch(error => {
                     console.error('[Service Worker] Fetch failed, returning offline page/fallback if available:', error);
                     // Optionally return an offline fallback page if fetch fails
                     // return caches.match('/offline.html'); 
                });
            })
    );
});

