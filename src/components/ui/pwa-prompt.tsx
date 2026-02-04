'use client';

// PWA install banner component
import { useState, useEffect } from 'react';
import { X, Download, Smartphone, Wifi, WifiOff } from 'lucide-react';
import { usePWA } from '@/hooks/use-pwa';
import { cn } from '@/lib/utils';
import { Button } from './button';

export function PWAPrompt() {
  const { isInstallable, isInstalled, isOnline, promptInstall } = usePWA();
  const [isDismissed, setIsDismissed] = useState(false);
  const [showOfflineToast, setShowOfflineToast] = useState(false);

  // Check localStorage for dismissed state
  useEffect(() => {
    const dismissed = localStorage.getItem('pwa-prompt-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      // Show again after 7 days
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
        setIsDismissed(true);
      }
    }
  }, []);

  // Show offline toast when going offline
  useEffect(() => {
    if (!isOnline) {
      setShowOfflineToast(true);
      const timer = setTimeout(() => setShowOfflineToast(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  const handleInstall = async () => {
    const success = await promptInstall();
    if (success) {
      setIsDismissed(true);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
  };

  // Don't show if already installed, dismissed, or not installable
  if (isInstalled || isDismissed || !isInstallable) {
    return (
      <>
        {/* Offline indicator */}
        {showOfflineToast && (
          <div className={cn(
            'fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50',
            'bg-amber-100 dark:bg-amber-900/90 text-amber-800 dark:text-amber-200',
            'rounded-xl p-4 shadow-lg border border-amber-200 dark:border-amber-700',
            'animate-slide-up flex items-center gap-3'
          )}>
            <WifiOff className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">
              You&apos;re offline. Some features may be limited.
            </span>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {/* Install prompt banner */}
      <div className={cn(
        'fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50',
        'bg-white dark:bg-gray-800 rounded-2xl shadow-2xl',
        'border border-gray-200 dark:border-gray-700',
        'animate-slide-up overflow-hidden'
      )}>
        {/* Gradient accent bar */}
        <div className="h-1 bg-gradient-to-r from-primary-500 via-primary-600 to-primary-700" />
        
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Install HabitTrack
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Add to your home screen for quick access and offline support
              </p>
            </div>

            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="p-1 -mt-1 -mr-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-4">
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={handleDismiss}
            >
              Not now
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={handleInstall}
            >
              <Download className="w-4 h-4 mr-1.5" />
              Install
            </Button>
          </div>
        </div>
      </div>

      {/* Online status indicator (corner) */}
      {!isOnline && (
        <div className="fixed top-20 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/90 text-amber-700 dark:text-amber-300 text-xs font-medium shadow-md">
          <WifiOff className="w-3 h-3" />
          Offline
        </div>
      )}
    </>
  );
}
