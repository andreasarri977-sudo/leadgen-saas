import React, { useState, useEffect } from 'react';
import { X, Download, Share, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                       window.navigator.standalone === true;
    setIsStandalone(standalone);

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);

    // Check if already dismissed
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    const dismissedTime = dismissed ? parseInt(dismissed, 10) : 0;
    const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);

    // Don't show if already installed or dismissed within 7 days
    if (standalone || (dismissed && daysSinceDismissed < 7)) {
      return;
    }

    // Listen for beforeinstallprompt (Chrome/Edge/Android)
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show prompt after 3 seconds
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // For iOS, show prompt after delay if not dismissed
    if (iOS && !dismissed) {
      setTimeout(() => setShowPrompt(true), 5000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log('[PWA] Install outcome:', outcome);
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // Don't render if already installed
  if (isStandalone || !showPrompt) {
    return null;
  }

  return (
    <div 
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white rounded-xl shadow-2xl border border-neutral-200 p-4 z-50 animate-in slide-in-from-bottom-4"
      data-testid="pwa-install-prompt"
    >
      <button 
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 text-neutral-400 hover:text-neutral-600"
        aria-label="Chiudi"
      >
        <X size={20} />
      </button>

      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center flex-shrink-0">
          <Download className="text-white" size={24} />
        </div>
        
        <div className="flex-1 pr-6">
          <h3 className="font-bold text-lg">Installa LeadHunter Pro</h3>
          <p className="text-sm text-neutral-600 mt-1">
            Aggiungi l'app alla tua home per un accesso rapido, anche offline.
          </p>
        </div>
      </div>

      {isIOS ? (
        // iOS instructions
        <div className="mt-4 p-3 bg-neutral-50 rounded-lg">
          <p className="text-sm font-medium mb-2">Come installare su iPhone/iPad:</p>
          <ol className="text-sm text-neutral-600 space-y-2">
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">1</span>
              Tocca <Share size={16} className="inline mx-1" /> in basso
            </li>
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">2</span>
              Scorri e tocca "Aggiungi a Home" <Plus size={16} className="inline mx-1" />
            </li>
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">3</span>
              Conferma toccando "Aggiungi"
            </li>
          </ol>
        </div>
      ) : (
        // Android/Chrome install button
        <div className="mt-4 flex gap-2">
          <Button 
            onClick={handleInstall}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
            data-testid="pwa-install-button"
          >
            <Download size={18} className="mr-2" />
            Installa App
          </Button>
          <Button 
            variant="outline" 
            onClick={handleDismiss}
          >
            Non ora
          </Button>
        </div>
      )}
    </div>
  );
}
