// API helper for Capacitor builds
// Uses absolute URLs when running in Capacitor (static export)

const API_BASE_URL = 'https://pms.globaltechtrums.com';

// Check if running in Capacitor
export function isCapacitor(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as any).Capacitor;
}

// Get the appropriate API URL
export function getApiUrl(path: string): string {
  // If running in Capacitor or as static export, use absolute URL
  if (isCapacitor() || (typeof window !== 'undefined' && window.location.protocol === 'file:')) {
    return `${API_BASE_URL}${path}`;
  }
  // Otherwise use relative URL (for server-side rendering)
  return path;
}

// Fetch wrapper that handles Capacitor URLs
export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const url = getApiUrl(path);

  // Add credentials for cross-origin requests
  const fetchOptions: RequestInit = {
    ...options,
    credentials: isCapacitor() ? 'include' : 'same-origin',
  };

  return fetch(url, fetchOptions);
}
