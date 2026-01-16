const fs = require('fs');
const filePath = 'C:/Users/PCS/pms/components/PushNotificationInit.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const oldCode = `// Listen for push notification action (when user taps notification)
        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          console.log('Push notification action:', notification);
          // Navigate to relevant screen based on notification data
          const data = notification.notification.data;
          if (data?.type === 'chat' && data?.projectId) {
            window.location.href = \`/dashboard/project/\${data.projectId}/chat\`;
          } else if (data?.type === 'report' && data?.projectId) {
            window.location.href = \`/dashboard/project/\${data.projectId}/reports\`;
          }
        });`;

const newCode = `// Listen for push notification action (when user taps notification)
        PushNotifications.addListener('pushNotificationActionPerformed', async (notification) => {
          console.log('Push notification action:', notification);
          const data = notification.notification.data;

          // Restore cookie from localStorage before navigating (Capacitor cookie persistence fix)
          const storedUserId = localStorage.getItem('pms_user_id');
          if (storedUserId) {
            try {
              await fetch('/api/auth/restore-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: storedUserId }),
                credentials: 'include'
              });
            } catch (e) {
              console.error('Failed to restore session:', e);
            }
          }

          // Navigate to relevant screen based on notification data
          if (data?.type === 'chat' && data?.projectId) {
            window.location.href = \`/dashboard/project/\${data.projectId}/chat\`;
          } else if (data?.type === 'report' && data?.projectId) {
            window.location.href = \`/dashboard/project/\${data.projectId}/reports\`;
          }
        });`;

content = content.replace(oldCode, newCode);
fs.writeFileSync(filePath, content);
console.log('Notification auth fix applied!');
