// Service Worker Registration for PWA
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    // Add cache busting for local testing
    const cacheBuster = Date.now();
    const swUrl = `/sw.js?v=${cacheBuster}`;
    
    navigator.serviceWorker.register(swUrl)
      .then((registration) => {
        console.log('📱 Service Worker registered successfully:', registration.scope);
        
        // Ask SW to check for updates
        registration.update();
        
        // Detect updates and prompt user
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Dispatch event so UI can show a toast/button
              window.dispatchEvent(new CustomEvent('swUpdateAvailable', {
                detail: {
                  update: () => {
                    // Ask the waiting SW to activate
                    if (registration.waiting) {
                      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                    } else if (newWorker.state === 'installed') {
                      newWorker.postMessage({ type: 'SKIP_WAITING' });
                    }
                  }
                }
              }));
            }
          });
        });

        // After SW takes control, reload (only after user confirms)
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (refreshing) return;
          refreshing = true;
          window.location.reload();
        });
      })
      .catch((error) => {
        console.error('📱 Service Worker registration failed:', error);
      });
  }
}

// Optional helper to wire a simple confirm prompt without UI libs
export function wireDefaultUpdatePrompt() {
  window.addEventListener('swUpdateAvailable', (e) => {
    const shouldUpdate = window.confirm('A new version of Bulwark CMS is available. Update now?');
    if (shouldUpdate) {
      e.detail.update();
    }
  });
}

// Show update notification
function showUpdateNotification() {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Bulwark CMS Update', {
      body: 'A new version is available. Refresh to update.',
      icon: '/android-chrome-192x192.png',
      badge: '/android-chrome-192x192.png'
    });
  }
}

// Request notification permission
export function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        console.log('📱 Notification permission granted');
      }
    });
  }
}

// Check if app is installed
export function isAppInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
}

// Show install prompt
export function showInstallPrompt() {
  if ('BeforeInstallPromptEvent' in window) {
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('📱 Install prompt event captured');
      e.preventDefault();
      
      // Store the event for later use
      window.deferredPrompt = e;
      
      // Show custom install button or prompt
      console.log('📱 Install prompt stored and available');
      
      // Dispatch a custom event to notify components
      window.dispatchEvent(new CustomEvent('installPromptAvailable', { detail: e }));
    });
  }
}
