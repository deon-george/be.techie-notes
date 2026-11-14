const API_URL = (import.meta.env.VITE_APPS_SCRIPT_URL || '').trim();
export const isConfigured = /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec(?:\?.*)?$/.test(API_URL);

// Apps Script ContentService does not consistently expose CORS headers.
// JSONP avoids cross-origin fetch failures for read-only PUBLIC deployments.
// Only use the Apps Script URL from a script that YOU control and trust.
let nextId = 0;
export function api(action, params = {}) {
  if (!isConfigured) return Promise.reject(new Error('Google Drive is not configured. See README.md.'));
  return new Promise((resolve, reject) => {
    const callback = `__btechNotesCb${++nextId}`;
    const script = document.createElement('script');
    let finished = false;
    const cleanup = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      delete window[callback];
      script.remove();
    };
    const timer = setTimeout(() => { cleanup(); reject(new Error('The Drive request timed out. Check deployment access and try again.')); }, 25000);
    window[callback] = (data) => {
      cleanup();
      if (data?.error) reject(new Error(data.error));
      else resolve(data);
    };
    script.onerror = () => { cleanup(); reject(new Error('Could not connect to Google Apps Script. Check the deployment URL and access settings.')); };
    const url = new URL(API_URL);
    url.searchParams.set('action', action);
    url.searchParams.set('callback', callback);
    url.searchParams.set('_', String(Date.now()));
    Object.entries(params).forEach(([key, value]) => { if (value != null) url.searchParams.set(key, String(value)); });
    script.src = url.toString();
    document.head.appendChild(script);
  });
}
