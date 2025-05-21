/**
 * Navigation utility for the Discord bridge app.
 * Provides functions to navigate between different routes.
 */

// Browser environment check
const isBrowser = typeof window !== 'undefined';

/**
 * Navigate to a specific route in the application.
 * @param route The route to navigate to (without the leading slash)
 * @param options Navigation options
 */
export function navigate(route: string, options?: { replace?: boolean; state?: any }) {
  // Only perform navigation in browser environment
  if (!isBrowser) {
    console.warn("Navigation attempted in non-browser environment");
    return;
  }
  
  const url = route.startsWith('/') ? route : `/${route}`;
  
  if (options?.replace) {
    window.history.replaceState(options.state || {}, '', url);
  } else {
    window.history.pushState(options?.state || {}, '', url);
  }
  
  // Dispatch a popstate event to trigger any listeners
  window.dispatchEvent(new PopStateEvent('popstate', {
    state: options?.state || {}
  }));
}