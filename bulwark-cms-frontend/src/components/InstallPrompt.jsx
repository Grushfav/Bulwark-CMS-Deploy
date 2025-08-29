import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Download, X } from 'lucide-react';

export default function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // Check if app is already installed
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                       window.navigator.standalone === true;

    if (isInstalled) {
      console.log('📱 App already installed, hiding prompt');
      return;
    }

    // Don't show install prompt on login page to avoid interference
    if (window.location.pathname === '/login') {
      console.log('📱 On login page, hiding install prompt');
      return;
    }

    // Check if app meets PWA criteria
    const checkPWACriteria = () => {
      const hasManifest = !!document.querySelector('link[rel="manifest"]');
      const hasServiceWorker = 'serviceWorker' in navigator;
      const isHTTPS = window.location.protocol === 'https:';
      
      console.log('📱 PWA Criteria Check:', {
        hasManifest,
        hasServiceWorker,
        isHTTPS,
        userAgent: navigator.userAgent
      });
      
      return hasManifest && hasServiceWorker && isHTTPS;
    };

    if (!checkPWACriteria()) {
      console.log('📱 App does not meet PWA criteria');
      return;
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e) => {
      console.log('📱 Install prompt event received');
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    // Listen for custom install prompt event
    const handleInstallPromptAvailable = (e) => {
      console.log('📱 Custom install prompt event received');
      setDeferredPrompt(e.detail);
      setShowPrompt(true);
    };

    // Check if prompt is already available
    if (window.deferredPrompt) {
      console.log('📱 Install prompt already available');
      setDeferredPrompt(window.deferredPrompt);
      setShowPrompt(true);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('installPromptAvailable', handleInstallPromptAvailable);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('installPromptAvailable', handleInstallPromptAvailable);
    };
  }, []);

  const handleInstall = async () => {
    console.log('📱 Install button clicked, deferredPrompt:', !!deferredPrompt);
    
    if (deferredPrompt) {
      try {
        console.log('📱 Calling deferredPrompt.prompt()');
        const { outcome } = await deferredPrompt.prompt();
        
        if (outcome === 'accepted') {
          console.log('📱 App installation accepted');
          setShowPrompt(false);
        } else {
          console.log('📱 App installation declined');
        }
        
        setDeferredPrompt(null);
      } catch (error) {
        console.error('📱 Error during install prompt:', error);
      }
    } else {
      console.log('📱 No deferredPrompt available');
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDeferredPrompt(null);
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
            <Download className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Install Bulwark CMS</h3>
            <p className="text-sm text-gray-600">Add to your home screen for quick access</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={handleInstall}
            size="sm"
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            Install
          </Button>
          <Button
            onClick={handleDismiss}
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
