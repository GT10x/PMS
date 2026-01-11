// Simple client-side cache for instant page loads
// Shows cached data immediately, then updates in background

const CACHE_PREFIX = 'pms_cache_';
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// Get cached data (returns null if expired or not found)
export function getCache<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(CACHE_PREFIX + key);
    if (!stored) return null;

    const entry: CacheEntry<T> = JSON.parse(stored);
    const now = Date.now();

    // Return data even if slightly stale (for instant display)
    // Let caller decide whether to refresh
    if (now - entry.timestamp < entry.ttl * 2) {
      return entry.data;
    }

    // Too old, clear it
    localStorage.removeItem(CACHE_PREFIX + key);
    return null;
  } catch {
    return null;
  }
}

// Check if cache is fresh (within TTL)
export function isCacheFresh(key: string): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const stored = localStorage.getItem(CACHE_PREFIX + key);
    if (!stored) return false;

    const entry = JSON.parse(stored);
    return Date.now() - entry.timestamp < entry.ttl;
  } catch {
    return false;
  }
}

// Set cache with TTL
export function setCache<T>(key: string, data: T, ttl: number = DEFAULT_TTL): void {
  if (typeof window === 'undefined') return;

  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch (e) {
    // Storage might be full, clear old entries
    clearOldCache();
  }
}

// Clear specific cache key
export function clearCache(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CACHE_PREFIX + key);
}

// Clear all PMS cache
export function clearAllCache(): void {
  if (typeof window === 'undefined') return;

  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
}

// Clear old cache entries
function clearOldCache(): void {
  if (typeof window === 'undefined') return;

  const now = Date.now();
  const keysToRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const entry = JSON.parse(stored);
          if (now - entry.timestamp > entry.ttl * 2) {
            keysToRemove.push(key);
          }
        }
      } catch {
        keysToRemove.push(key);
      }
    }
  }

  keysToRemove.forEach(key => localStorage.removeItem(key));
}

// Fetch with cache - shows cached data immediately, updates in background
export async function fetchWithCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options?: {
    ttl?: number;
    onCachedData?: (data: T) => void;
    onFreshData?: (data: T) => void;
  }
): Promise<T> {
  const { ttl = DEFAULT_TTL, onCachedData, onFreshData } = options || {};

  // Check cache first
  const cached = getCache<T>(key);
  if (cached) {
    onCachedData?.(cached);

    // If cache is fresh, don't refetch
    if (isCacheFresh(key)) {
      return cached;
    }
  }

  // Fetch fresh data
  try {
    const fresh = await fetchFn();
    setCache(key, fresh, ttl);
    onFreshData?.(fresh);
    return fresh;
  } catch (error) {
    // If fetch fails but we have cached data, use it
    if (cached) {
      return cached;
    }
    throw error;
  }
}
