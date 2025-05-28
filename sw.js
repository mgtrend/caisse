// sw.js - Service Worker optimisé
const CACHE_NAME = "mg-caisse-v1.0.0"
const STATIC_CACHE = "mg-static-v1"
const DYNAMIC_CACHE = "mg-dynamic-v1"

// Fichiers à mettre en cache
const STATIC_FILES = [
  "/",
  "/index.html",
  "/manifest.json",
  "/assets/js/app.js",
  "/assets/js/auth.js",
  "/assets/js/db.js",
  "https://cdn.tailwindcss.com",
]

// Ajuster les chemins pour GitHub Pages
function adjustPath(url) {
  const basePath = "/caisse"

  // Si l'URL contient déjà le chemin de base ou est une URL externe, ne pas modifier
  if (url.includes("://") || url.startsWith(basePath)) {
    return url
  }

  // Ajouter le chemin de base aux chemins relatifs
  if (url.startsWith("/")) {
    return `${basePath}${url}`
  }

  return `${basePath}/${url}`
}

// Ajuster les chemins des fichiers statiques
const ADJUSTED_STATIC_FILES = STATIC_FILES.map((file) => {
  if (file.startsWith("/") && !file.includes("://")) {
    return adjustPath(file)
  }
  return file
})

// Installation du Service Worker
self.addEventListener("install", (event) => {
  console.log("Service Worker installing...")
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log("Caching static files")
        return cache.addAll(ADJUSTED_STATIC_FILES)
      })
      .then(() => self.skipWaiting()),
  )
})

// Activation du Service Worker
self.addEventListener("activate", (event) => {
  console.log("Service Worker activating...")
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log("Deleting old cache:", cacheName)
              return caches.delete(cacheName)
            }
          }),
        )
      })
      .then(() => self.clients.claim()),
  )
})

// Stratégie de cache
self.addEventListener("fetch", (event) => {
  const { request } = event

  // Ajuster l'URL pour la comparaison
  const url = new URL(request.url)
  const adjustedUrl = adjustPath(url.pathname)

  // Vérifier si c'est un fichier statique
  const isStaticFile =
    ADJUSTED_STATIC_FILES.includes(adjustedUrl) ||
    url.pathname.includes("/assets/") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".html")

  // Stratégie Cache First pour les ressources statiques
  if (isStaticFile) {
    event.respondWith(
      caches.match(request).then((response) => {
        return (
          response ||
          fetch(request)
            .then((fetchResponse) => {
              return caches.open(STATIC_CACHE).then((cache) => {
                cache.put(request, fetchResponse.clone())
                return fetchResponse
              })
            })
            .catch(() => {
              // Fallback pour les fichiers HTML
              if (request.headers.get("accept").includes("text/html")) {
                return caches.match("/index.html")
              }
              return new Response("Ressource non disponible", { status: 404 })
            })
        )
      }),
    )
    return
  }

  // Stratégie Network First pour les API
  if (request.url.includes("/api/") || request.url.includes("supabase.co")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Sauvegarder en cache si succès
          if (response.ok) {
            const responseClone = response.clone()
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseClone)
            })
          }
          return response
        })
        .catch(() => {
          // Fallback sur le cache en cas d'échec
          return caches.match(request)
        }),
    )
    return
  }

  // Stratégie par défaut
  event.respondWith(
    caches.match(request).then((response) => {
      return (
        response ||
        fetch(request).catch(() => {
          // Page offline par défaut
          if (request.headers.get("accept").includes("text/html")) {
            return caches.match("/index.html")
          }
        })
      )
    }),
  )
})

// Gestion des messages depuis l'application
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting()
  }

  if (event.data && event.data.type === "CACHE_URLS") {
    const urlsToCache = event.data.payload
    caches.open(DYNAMIC_CACHE).then((cache) => cache.addAll(urlsToCache))
  }
})

// Synchronisation en arrière-plan
self.addEventListener("sync", (event) => {
  if (event.tag === "background-sync") {
    event.waitUntil(doBackgroundSync())
  }
})

async function doBackgroundSync() {
  // Synchroniser les données en attente
  try {
    const cache = await caches.open(DYNAMIC_CACHE)
    const requests = await cache.keys()

    for (const request of requests) {
      if (request.url.includes("sync-queue")) {
        try {
          await fetch(request)
          await cache.delete(request)
        } catch (error) {
          console.log("Sync failed for:", request.url)
        }
      }
    }
  } catch (error) {
    console.error("Background sync failed:", error)
  }
}
