// Notification service for PMS
// Handles sound notifications and browser notifications

const NOTIFICATION_SOUND_URL = '/sounds/notification.wav';
const STORAGE_KEY = 'pms_notification_settings';

interface NotificationSettings {
  soundEnabled: boolean;
  browserNotificationsEnabled: boolean;
  volume: number;
}

// Default settings
const defaultSettings: NotificationSettings = {
  soundEnabled: true,
  browserNotificationsEnabled: true,
  volume: 0.5,
};

// Audio element singleton
let audioElement: HTMLAudioElement | null = null;

// Get notification settings from localStorage
export function getNotificationSettings(): NotificationSettings {
  if (typeof window === 'undefined') return defaultSettings;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Error reading notification settings:', e);
  }
  return defaultSettings;
}

// Save notification settings
export function saveNotificationSettings(settings: Partial<NotificationSettings>): void {
  if (typeof window === 'undefined') return;

  try {
    const current = getNotificationSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Error saving notification settings:', e);
  }
}

// Initialize audio element
function getAudioElement(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;

  if (!audioElement) {
    audioElement = new Audio(NOTIFICATION_SOUND_URL);
    audioElement.preload = 'auto';
  }
  return audioElement;
}

// Play notification sound
export async function playNotificationSound(): Promise<void> {
  const settings = getNotificationSettings();
  if (!settings.soundEnabled) return;

  const audio = getAudioElement();
  if (!audio) return;

  try {
    audio.volume = settings.volume;
    audio.currentTime = 0;
    await audio.play();
  } catch (error) {
    // Audio playback may fail due to browser autoplay policies
    console.log('Could not play notification sound:', error);
  }
}

// Request browser notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

// Show browser notification
export async function showBrowserNotification(
  title: string,
  options?: NotificationOptions
): Promise<void> {
  const settings = getNotificationSettings();
  if (!settings.browserNotificationsEnabled) return;

  if (typeof window === 'undefined' || !('Notification' in window)) return;

  if (Notification.permission !== 'granted') {
    const granted = await requestNotificationPermission();
    if (!granted) return;
  }

  try {
    const notification = new Notification(title, {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      ...options,
    });

    // Auto-close after 5 seconds
    setTimeout(() => notification.close(), 5000);

    // Focus window when notification is clicked
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch (error) {
    console.log('Could not show notification:', error);
  }
}

// Combined notification (sound + browser notification)
export async function notify(
  title: string,
  body?: string,
  options?: { playSound?: boolean; showNotification?: boolean }
): Promise<void> {
  const { playSound = true, showNotification = true } = options || {};

  // Play sound
  if (playSound) {
    await playNotificationSound();
  }

  // Show browser notification (only if tab is not focused)
  if (showNotification && document.hidden) {
    await showBrowserNotification(title, { body });
  }
}

// IndexedDB for local data caching
const DB_NAME = 'pms_cache';
const DB_VERSION = 1;

interface CacheStore {
  projects: any[];
  messages: Record<string, any[]>;
  lastSync: Record<string, number>;
}

let dbInstance: IDBDatabase | null = null;

async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object stores
      if (!db.objectStoreNames.contains('cache')) {
        db.createObjectStore('cache', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('messages')) {
        const messageStore = db.createObjectStore('messages', { keyPath: 'id' });
        messageStore.createIndex('projectId', 'project_id', { unique: false });
      }
      if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'id' });
      }
    };
  });
}

// Cache data in IndexedDB
export async function cacheData(key: string, data: any): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const db = await getDB();
    const transaction = db.transaction('cache', 'readwrite');
    const store = transaction.objectStore('cache');

    store.put({ key, data, timestamp: Date.now() });
  } catch (error) {
    console.error('Error caching data:', error);
  }
}

// Get cached data from IndexedDB
export async function getCachedData<T>(key: string, maxAge?: number): Promise<T | null> {
  if (typeof window === 'undefined') return null;

  try {
    const db = await getDB();
    const transaction = db.transaction('cache', 'readonly');
    const store = transaction.objectStore('cache');

    return new Promise((resolve) => {
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          resolve(null);
          return;
        }

        // Check if cache is expired
        if (maxAge && Date.now() - result.timestamp > maxAge) {
          resolve(null);
          return;
        }

        resolve(result.data as T);
      };

      request.onerror = () => resolve(null);
    });
  } catch (error) {
    console.error('Error getting cached data:', error);
    return null;
  }
}

// Cache messages for a project
export async function cacheMessages(projectId: string, messages: any[]): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const db = await getDB();
    const transaction = db.transaction('messages', 'readwrite');
    const store = transaction.objectStore('messages');

    // Clear old messages for this project
    const index = store.index('projectId');
    const range = IDBKeyRange.only(projectId);
    const cursor = index.openCursor(range);

    cursor.onsuccess = (event) => {
      const c = (event.target as IDBRequest).result;
      if (c) {
        store.delete(c.primaryKey);
        c.continue();
      }
    };

    // Add new messages
    messages.forEach((msg) => {
      store.put({ ...msg, project_id: projectId });
    });
  } catch (error) {
    console.error('Error caching messages:', error);
  }
}

// Get cached messages for a project
export async function getCachedMessages(projectId: string): Promise<any[]> {
  if (typeof window === 'undefined') return [];

  try {
    const db = await getDB();
    const transaction = db.transaction('messages', 'readonly');
    const store = transaction.objectStore('messages');
    const index = store.index('projectId');

    return new Promise((resolve) => {
      const request = index.getAll(projectId);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  } catch (error) {
    console.error('Error getting cached messages:', error);
    return [];
  }
}

// Preload the notification sound
export function preloadNotificationSound(): void {
  if (typeof window === 'undefined') return;
  getAudioElement();
}
