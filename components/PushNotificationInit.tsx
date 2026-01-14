'use client';

import { useEffect, useRef } from 'react';

// Check if we're in a Capacitor native app
const isCapacitor = () => {
  return typeof window !== 'undefined' &&
         (window as any).Capacitor !== undefined;
};

export default function PushNotificationInit() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const initPushNotifications = async () => {
      if (!isCapacitor()) {
        console.log('Not running in Capacitor, skipping push notification init');
        return;
      }

      try {
        // Dynamically import Capacitor push notifications
        const { PushNotifications } = await import('@capacitor/push-notifications');

        // Request permission
        const permResult = await PushNotifications.requestPermissions();
        console.log('Push permission result:', permResult);

        if (permResult.receive !== 'granted') {
          console.log('Push notification permission not granted');
          return;
        }

        // Register for push notifications
        await PushNotifications.register();
        console.log('Registered for push notifications');

        // Listen for registration success
        PushNotifications.addListener('registration', async (token) => {
          console.log('Push registration token:', token.value);

          // Send token to our server
          try {
            const response = await fetch('/api/push-tokens', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                token: token.value,
                device_type: 'android'
              }),
              credentials: 'include'
            });

            if (response.ok) {
              console.log('Push token registered with server');
            } else {
              console.error('Failed to register push token with server');
            }
          } catch (error) {
            console.error('Error sending push token to server:', error);
          }
        });

        // Listen for registration errors
        PushNotifications.addListener('registrationError', (error) => {
          console.error('Push registration error:', error);
        });

        // Listen for push notifications received
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('Push notification received:', notification);
          // You can show a local notification or update UI here
        });

        // Listen for push notification action (when user taps notification)
        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          console.log('Push notification action:', notification);
          // Navigate to relevant screen based on notification data
          const data = notification.notification.data;
          if (data?.type === 'chat' && data?.projectId) {
            window.location.href = `/dashboard/project/${data.projectId}/chat`;
          } else if (data?.type === 'report' && data?.projectId) {
            window.location.href = `/dashboard/project/${data.projectId}/reports`;
          }
        });

      } catch (error) {
        console.error('Error initializing push notifications:', error);
      }
    };

    // Wait a bit for the app to be fully loaded and user to be authenticated
    setTimeout(initPushNotifications, 2000);
  }, []);

  return null;
}
