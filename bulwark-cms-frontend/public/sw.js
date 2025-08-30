// Service Worker for Bulwark CMS PWA
const CACHE_NAME = 'bulwark-cms-v1.0.0';
const urlsToCache = [
  '/',
  '/dashboard',
  '/team',
  '/clients',
  '/sales',
  '/goals',
  '/reminders',
  '/content',
  '/reports',
  '/profile',
  '/manifest.json',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('📱 Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📱 Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('📱 Cache installation failed:', error);
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other unsupported schemes
  if (event.request.url.startsWith('chrome-extension://') || 
      event.request.url.startsWith('moz-extension://') ||
      event.request.url.startsWith('ms-browser-extension://')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request)
          .then((fetchResponse) => {
            // Check if we received a valid response
            if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
              return fetchResponse;
            }

            // Clone the response
            const responseToCache = fetchResponse.clone();

            // Cache the fetched response
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              })
              .catch((error) => {
                console.error('📱 Cache put failed:', error);
              });

            return fetchResponse;
          })
          .catch((error) => {
            console.error('📱 Fetch failed:', error);
            // Return a fallback response for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('/');
            }
          });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('📱 Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
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
