// Firebase Cloud Messaging utility using Firebase Admin SDK
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK (singleton)
function getFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!serviceAccount) {
    console.warn('FIREBASE_SERVICE_ACCOUNT not configured, push notifications disabled');
    return null;
  }

  try {
    const credentials = JSON.parse(serviceAccount);
    return admin.initializeApp({
      credential: admin.credential.cert(credentials),
    });
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
    return null;
  }
}

interface PushNotification {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export async function sendPushNotification(
  tokens: string[],
  notification: PushNotification
): Promise<{ success: number; failure: number }> {
  const app = getFirebaseAdmin();

  if (!app) {
    return { success: 0, failure: 0 };
  }

  if (tokens.length === 0) {
    return { success: 0, failure: 0 };
  }

  const results = { success: 0, failure: 0 };

  try {
    // Use sendEachForMulticast for better error handling
    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: notification.data || {},
      android: {
        priority: 'high' as const,
        notification: {
          sound: 'default',
          channelId: 'pms_notifications',
        },
      },
      tokens: tokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    results.success = response.successCount;
    results.failure = response.failureCount;

    // Log failures for debugging
    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.warn(`FCM error for token ${tokens[idx]?.slice(0, 20)}...: ${resp.error?.message}`);
        }
      });
    }
  } catch (error) {
    console.error('Error sending FCM notification:', error);
    results.failure = tokens.length;
  }

  return results;
}

export async function sendPushToUsers(
  supabaseAdmin: any,
  userIds: string[],
  notification: PushNotification,
  excludeUserId?: string
): Promise<{ success: number; failure: number }> {
  // Filter out the sender
  const targetUserIds = excludeUserId
    ? userIds.filter(id => id !== excludeUserId)
    : userIds;

  if (targetUserIds.length === 0) {
    return { success: 0, failure: 0 };
  }

  // Get push tokens for users
  const { data: tokenRecords } = await supabaseAdmin
    .from('push_tokens')
    .select('token')
    .in('user_id', targetUserIds)
    .eq('is_active', true);

  const tokens = tokenRecords?.map((r: any) => r.token) || [];

  if (tokens.length === 0) {
    return { success: 0, failure: 0 };
  }

  return sendPushNotification(tokens, notification);
}
