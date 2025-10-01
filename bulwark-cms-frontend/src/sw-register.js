// Service Worker Registration for PWA
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    const swUrl = `/sw.js`;
    
    navigator.serviceWorker.register(swUrl, { updateViaCache: 'none' })
      .then((registration) => {
        console.log('📱 Service Worker registered successfully:', registration.scope);
        
        // Check for updates periodically (every 60 minutes)
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
        
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

// ---------- PWA Install Prompt (Windows/Android via beforeinstallprompt; iOS via instructions) ----------

let deferredInstallPrompt = null;

export function wireDefaultInstallPrompt() {
  // Avoid prompting if already installed
  const isInstalled = isAppInstalled();
  if (isInstalled) return;

  // Only once per page load
  if (sessionStorage.getItem('pwa-install-prompt-shown') === '1') return;

  const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (isStandalone) return;

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent auto mini-infobar and store the event
    e.preventDefault();
    deferredInstallPrompt = e;

    // Dispatch an event so the app can show a custom UI instead
    window.dispatchEvent(new CustomEvent('pwaInstallAvailable', {
      detail: {
        prompt: () => deferredInstallPrompt?.prompt(),
        getOutcome: async () => {
          if (!deferredInstallPrompt) return null;
          const outcome = await deferredInstallPrompt.userChoice;
          deferredInstallPrompt = null;
          return outcome;
        }
      }
    }));

    // Default confirm prompt if the app doesn't handle the event
    if (!isIOS && sessionStorage.getItem('pwa-install-prompt-shown') !== '1') {
      sessionStorage.setItem('pwa-install-prompt-shown', '1');
      const accept = window.confirm('Install Bulwark CMS for a better experience?');
      if (accept) {
        deferredInstallPrompt.prompt();
        deferredInstallPrompt.userChoice.finally(() => {
          deferredInstallPrompt = null;
        });
      }
    }
  });

  // iOS: no beforeinstallprompt; show instructions once per session
  if (isIOS && sessionStorage.getItem('pwa-install-prompt-shown') !== '1') {
    sessionStorage.setItem('pwa-install-prompt-shown', '1');
    // Basic instruction; can be replaced by a nicer banner in UI
    alert('To install Bulwark CMS on iOS: 1) Tap the Share button in Safari, 2) Choose "Add to Home Screen".');
  }

  // Mark installed
  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    sessionStorage.removeItem('pwa-install-prompt-shown');
    console.log('📱 PWA installed');
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
