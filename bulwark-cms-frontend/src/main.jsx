import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './App.css'
import App from './App.jsx'
import { registerServiceWorker, requestNotificationPermission } from './sw-register.js'

// Register service worker for PWA
registerServiceWorker();

// Request notification permission
requestNotificationPermission();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
