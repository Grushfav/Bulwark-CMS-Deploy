// Service Worker Registration for PWA
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('📱 Service Worker registered successfully:', registration.scope);
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New version available
                console.log('📱 New version available');
                showUpdateNotification();
              }
            });
          });
        })
        .catch((error) => {
          console.error('📱 Service Worker registration failed:', error);
        });
    });
  }
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
      e.preventDefault();
      
      // Store the event for later use
      window.deferredPrompt = e;
      
      // Show custom install button or prompt
      console.log('📱 Install prompt available');
      
      // You can trigger this from a button click
      // installButton.addEventListener('click', () => {
      //   window.deferredPrompt.prompt();
      // });
    });
  }
}
