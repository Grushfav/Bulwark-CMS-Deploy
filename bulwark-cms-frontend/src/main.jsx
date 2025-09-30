import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './App.css'
import App from './App.jsx'
import { registerServiceWorker, requestNotificationPermission, wireDefaultUpdatePrompt, wireDefaultInstallPrompt } from './sw-register.js'

// Register service worker and notifications only in production to avoid dev caching issues
if (import.meta.env.PROD) {
  registerServiceWorker();
  requestNotificationPermission();
  // Simple built-in confirm prompt; can be replaced with a toast in UI
  wireDefaultUpdatePrompt();
  // Install prompt (Windows/Android via beforeinstallprompt; iOS via instructions)
  wireDefaultInstallPrompt();
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
