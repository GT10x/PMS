const fs = require('fs');
const filePath = 'C:/Users/PCS/pms/components/NotificationProvider.tsx';

const content = `'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { notify, preloadNotificationSound, requestNotificationPermission } from '@/lib/notifications';

interface NotificationCounts {
  [projectId: string]: {
    chat: number;
    reports: number;
    projectName: string;
  };
}

export default function NotificationProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const lastCountsRef = useRef<NotificationCounts>({});
  const isInitializedRef = useRef(false);

  useEffect(() => {
    // Don't run on login page
    if (pathname === '/login' || pathname === '/') return;

    // Initialize notifications
    preloadNotificationSound();
    requestNotificationPermission();

    // Poll for notification counts every 10 seconds
    const pollNotifications = async () => {
      try {
        const response = await fetch('/api/notifications/counts');
        if (!response.ok) return;

        const data = await response.json();
        const counts: NotificationCounts = data.counts || {};

        // Check for new notifications (compare with last counts)
        // Skip first poll to establish baseline
        if (isInitializedRef.current) {
          for (const projectId in counts) {
            const current = counts[projectId];
            const last = lastCountsRef.current[projectId];

            // New chat messages
            if (current.chat > (last?.chat || 0)) {
              const newCount = current.chat - (last?.chat || 0);
              notify(
                \`\${newCount} new message\${newCount > 1 ? 's' : ''} in \${current.projectName}\`,
                'You have new chat messages',
                { showNotification: true }
              );
            }

            // New reports
            if (current.reports > (last?.reports || 0)) {
              const newCount = current.reports - (last?.reports || 0);
              notify(
                \`\${newCount} new report\${newCount > 1 ? 's' : ''} in \${current.projectName}\`,
                'You have new bug reports',
                { showNotification: true }
              );
            }
          }
        }

        lastCountsRef.current = counts;
        isInitializedRef.current = true;
      } catch (error) {
        // Silent fail
      }
    };

    // Initial fetch to establish baseline (no notifications on first load)
    pollNotifications();

    // Start polling
    const pollInterval = setInterval(pollNotifications, 10000);
    return () => clearInterval(pollInterval);
  }, [pathname]);

  return <>{children}</>;
}
`;

fs.writeFileSync(filePath, content);
console.log('Fixed NotificationProvider.tsx');
