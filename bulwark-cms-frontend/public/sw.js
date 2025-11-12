// Service Worker for Bulwark CMS PWA
const CACHE_VERSION = 'v1.1.0';
const STATIC_CACHE = `bulwark-cms-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `bulwark-cms-runtime-${CACHE_VERSION}`;

const STATIC_ASSETS = new Set([
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png'
]);

// Install event - cache core static resources
self.addEventListener('install', (event) => {
  console.log('📱 Service Worker installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('📱 Pre-caching core assets');
        return cache.addAll(Array.from(STATIC_ASSETS));
      })
      .catch((error) => {
        console.error('📱 Static cache installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (![STATIC_CACHE, RUNTIME_CACHE].includes(cacheName)) {
            console.log('📱 Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
          return undefined;
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - apply tailored caching strategies
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(event.request.url);

  // Skip cross-origin requests (they'll use the network directly)
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  // Skip extension schemes
  if (requestUrl.protocol === 'chrome-extension:' ||
      requestUrl.protocol === 'moz-extension:' ||
      requestUrl.protocol === 'ms-browser-extension:') {
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirst(event.request));
    return;
  }

  if (isApiRequest(requestUrl)) {
    event.respondWith(networkFirst(event.request, { cacheApiResponse: false }));
    return;
  }

  if (STATIC_ASSETS.has(requestUrl.pathname)) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
    return;
  }

  // Static asset heuristics (hashed bundles, images, fonts, etc.)
  if (shouldUseStaticAssetStrategy(event.request)) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }
});

function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

function shouldUseStaticAssetStrategy(request) {
  const destinations = ['style', 'script', 'image', 'font', 'audio', 'video'];
  if (destinations.includes(request.destination)) {
    return true;
  }

  // Heuristic for hashed build assets (e.g., /assets/XYZ.js)
  const url = new URL(request.url);
  return url.pathname.startsWith('/assets/');
}

async function networkFirst(request, options = {}) {
  const { cacheApiResponse = true } = options;
  const runtimeCache = await caches.open(RUNTIME_CACHE);

  try {
    const response = await fetch(request);
    if (cacheApiResponse && shouldCacheResponse(request, response)) {
      runtimeCache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cachedResponse = await runtimeCache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    if (request.mode === 'navigate') {
      const fallback = await caches.match('/');
      if (fallback) {
        return fallback;
      }
      return new Response(
        '<h1>Offline</h1><p>You appear to be offline. Please reconnect to continue.</p>',
        { headers: { 'Content-Type': 'text/html' }, status: 503 }
      );
    }

    throw error;
  }
}

async function staleWhileRevalidate(request) {
  const runtimeCache = await caches.open(RUNTIME_CACHE);
  const cachedResponse = await runtimeCache.match(request);
  const networkResponsePromise = fetch(request)
    .then((response) => {
      if (shouldCacheResponse(request, response)) {
        runtimeCache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => undefined);

  if (cachedResponse) {
    // Return cached response immediately while updating cache in the background
    return cachedResponse;
  }

  const networkResponse = await networkResponsePromise;
  if (networkResponse) {
    return networkResponse;
  }

  return fetch(request);
}

function shouldCacheResponse(request, response) {
  if (!response || response.status !== 200 || response.type !== 'basic') {
    return false;
  }

  const url = new URL(request.url);
  if (isApiRequest(url)) {
    return false;
  }

  return true;
}

// Listen for messages from clients (e.g., to skip waiting)
self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Handle push notifications (future feature)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/android-chrome-192x192.png',
      badge: '/android-chrome-192x192.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      },
      actions: [
        {
          action: 'explore',
          title: 'View',
          icon: '/android-chrome-192x192.png'
        },
        {
          action: 'close',
          title: 'Close',
          icon: '/android-chrome-192x192.png'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
