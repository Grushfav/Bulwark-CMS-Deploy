import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './App.css'
import App from './App.jsx'
import { registerServiceWorker, requestNotificationPermission } from './sw-register.js'

// Register service worker and notifications only in production to avoid dev caching issues
if (import.meta.env.PROD) {
  registerServiceWorker();
  requestNotificationPermission();
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
