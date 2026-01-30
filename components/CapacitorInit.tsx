'use client';

import { useEffect } from 'react';

export default function CapacitorInit() {
  useEffect(() => {
    const initCapacitor = async () => {
      try {
        // Only run in Capacitor environment
        if (!(window as any).Capacitor) return;

        const { App } = await import('@capacitor/app');

        // Handle Android back button
        App.addListener('backButton', ({ canGoBack }) => {
          if (canGoBack) {
            window.history.back();
          } else {
            // At root page - minimize app instead of closing
            App.minimizeApp();
          }
        });
      } catch (error) {
        // Not in Capacitor environment, ignore
      }
    };

    initCapacitor();
  }, []);

  return null;
}
