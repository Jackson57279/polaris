/**
 * Stack Auth integration for Electron
 * Handles authentication in desktop environment using M2M tokens
 */

import { isElectron } from './environment';

export interface StackAuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

/**
 * Get Stack Auth access token for Electron M2M authentication
 * This should be called from the Electron main process
 */
export async function getStackM2MToken(secretServerKey: string): Promise<string | null> {
  try {
    const response = await fetch('https://api.stack-auth.com/api/v1/auth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-stack-secret-server-key': secretServerKey,
        'x-stack-project-id': process.env.NEXT_PUBLIC_STACK_PROJECT_ID || '',
      },
      body: JSON.stringify({
        grant_type: 'client_credentials',
      }),
    });

    if (!response.ok) {
      console.error('Failed to get M2M token:', response.statusText);
      return null;
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error getting M2M token:', error);
    return null;
  }
}

/**
 * Store authentication token in Electron
 * Uses electron-store for persistent storage
 */
export async function storeAuthToken(token: StackAuthToken) {
  if (!isElectron()) {
    console.warn('storeAuthToken called outside Electron environment');
    return;
  }

  try {
    await window.electron.store.set('stack_auth_token', token);
  } catch (error) {
    console.error('Failed to store auth token:', error);
  }
}

/**
 * Retrieve authentication token from Electron storage
 */
export async function getStoredAuthToken(): Promise<StackAuthToken | null> {
  if (!isElectron()) {
    return null;
  }

  try {
    const token = await window.electron.store.get('stack_auth_token');
    
    // Check if token is expired
    if (token && token.expiresAt < Date.now()) {
      await clearAuthToken();
      return null;
    }

    return token || null;
  } catch (error) {
    console.error('Failed to retrieve auth token:', error);
    return null;
  }
}

/**
 * Clear stored authentication token
 */
export async function clearAuthToken() {
  if (!isElectron()) {
    return;
  }

  try {
    await window.electron.store.delete('stack_auth_token');
  } catch (error) {
    console.error('Failed to clear auth token:', error);
  }
}

/**
 * Check if user is authenticated in Electron
 */
export async function isElectronAuthenticated(): Promise<boolean> {
  const token = await getStoredAuthToken();
  return token !== null && token.expiresAt > Date.now();
}

/**
 * Get Convex auth token for Electron
 * This integrates Stack Auth with Convex for desktop app
 */
export async function getConvexAuthForElectron(): Promise<string | null> {
  const token = await getStoredAuthToken();
  
  if (!token) {
    return null;
  }

  // Stack Auth tokens can be used directly with Convex when properly configured
  return token.accessToken;
}
