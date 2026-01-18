export const DEBUG_AI_PROVIDER_KEY = 'DEBUG_AI_PROVIDER';

export function isDebugModeEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage?.getItem(DEBUG_AI_PROVIDER_KEY) === 'true';
}

export function enableDebugMode(): void {
  if (typeof window !== 'undefined') {
    window.localStorage?.setItem(DEBUG_AI_PROVIDER_KEY, 'true');
    console.log('[Debug Mode] AI Provider debug mode enabled');
  }
}

export function disableDebugMode(): void {
  if (typeof window !== 'undefined') {
    window.localStorage?.removeItem(DEBUG_AI_PROVIDER_KEY);
    console.log('[Debug Mode] AI Provider debug mode disabled');
  }
}

export function toggleDebugMode(): boolean {
  const enabled = isDebugModeEnabled();
  if (enabled) {
    disableDebugMode();
  } else {
    enableDebugMode();
  }
  return !enabled;
}

if (typeof window !== 'undefined') {
  (window as any).toggleAIDebug = toggleDebugMode;
  console.log('[Debug Mode] Use window.toggleAIDebug() to toggle AI provider debugging');
}
