// Service Worker Registration for PWA
let serviceWorkerRegistration = null;

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    const swUrl = `/sw.js`;
    
    navigator.serviceWorker.register(swUrl, { updateViaCache: 'none' })
      .then((registration) => {
        serviceWorkerRegistration = registration;
        console.log('📱 Service Worker registered successfully:', registration.scope);
        
        // Check for updates periodically (every 60 minutes)
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
        
        // Check if there's already a waiting worker
        if (registration.waiting) {
          window.dispatchEvent(new CustomEvent('swUpdateAvailable', {
            detail: {
              update: async () => {
                console.log('📱 User confirmed update, activating new service worker');
                try {
                  if (registration.waiting) {
                    console.log('📱 Found waiting worker, sending SKIP_WAITING message');
                    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                  } else {
                    const reg = await navigator.serviceWorker.getRegistration();
                    if (reg && reg.waiting) {
                      console.log('📱 Found waiting worker via getRegistration, sending SKIP_WAITING');
                      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                    } else {
                      console.error('📱 No waiting service worker found - forcing reload');
                      window.location.reload();
                    }
                  }
                } catch (error) {
                  console.error('📱 Error sending SKIP_WAITING message:', error);
                  window.location.reload();
                }
              }
            }
          }));
        }
        
        // Detect updates and prompt user
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          
          newWorker.addEventListener('statechange', () => {
            console.log('📱 Service Worker state changed:', newWorker.state);
            // When the new worker is installed and there's an active controller,
            // it means there's an update waiting
            if (newWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // There's a new version available
                console.log('📱 New service worker installed, waiting for activation');
                window.dispatchEvent(new CustomEvent('swUpdateAvailable', {
                  detail: {
                    update: async () => {
                      console.log('📱 User confirmed update, activating new service worker');
                      try {
                        // Always check registration.waiting first (most reliable)
                        if (registration.waiting) {
                          console.log('📱 Found waiting worker, sending SKIP_WAITING message');
                          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                        } else {
                          // If no waiting worker, try to get registration again
                          const reg = await navigator.serviceWorker.getRegistration();
                          if (reg && reg.waiting) {
                            console.log('📱 Found waiting worker via getRegistration, sending SKIP_WAITING');
                            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                          } else {
                            console.error('📱 No waiting service worker found - update may have already been applied');
                            // Force reload as fallback
                            window.location.reload();
                          }
                        }
                      } catch (error) {
                        console.error('📱 Error sending SKIP_WAITING message:', error);
                        // Fallback: force reload
                        window.location.reload();
                      }
                    }
                  }
                }));
              } else {
                // This is the first install, not an update
                console.log('📱 Service Worker installed for the first time');
              }
            }
          });
        });

        // After SW takes control, reload (only after user confirms)
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (refreshing) return;
          refreshing = true;
          console.log('📱 Service Worker controller changed, reloading page');
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
