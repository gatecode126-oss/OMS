/**
 * @file src/lib/dedupeFetch.js
 * @description Shares one network request between identical API reads that are in flight at
 * the same time.
 *
 * Several screens and widgets load the same data on mount (e.g. the dashboard requested
 * /api/v1/attendance 9 times while loading). While a GET to the app's own API is pending, an
 * identical GET (same URL, same Authorization header) reuses it and receives its own copy of
 * the response. Nothing is cached: once the response arrives, the next call goes to the
 * network again, so refreshes still return fresh data.
 */

const isApiUrl = (url) => {
  const base = typeof window !== 'undefined' ? window.API_URL : '';
  if (url.startsWith('/api/')) return true;
  return !!base && url.startsWith(`${base}/api/`);
};

const getAuthHeader = (headers) => {
  if (!headers) return '';
  if (typeof Headers !== 'undefined' && headers instanceof Headers) return headers.get('Authorization') || '';
  if (Array.isArray(headers)) {
    const entry = headers.find(([k]) => String(k).toLowerCase() === 'authorization');
    return entry ? entry[1] : '';
  }
  return headers.Authorization || headers.authorization || '';
};

if (typeof window !== 'undefined' && typeof window.fetch === 'function' && !window.__omsFetchDedupe) {
  window.__omsFetchDedupe = true;
  const nativeFetch = window.fetch.bind(window);
  const inFlight = new Map();

  window.fetch = (input, init) => {
    // Only plain string-URL GETs to our API, without a body or an abort signal
    // (one caller aborting must not cancel the request for the others).
    const method = (init?.method || 'GET').toUpperCase();
    if (typeof input !== 'string' || method !== 'GET' || init?.body || init?.signal || !isApiUrl(input)) {
      return nativeFetch(input, init);
    }

    const key = `${input}\n${getAuthHeader(init?.headers)}`;
    let pending = inFlight.get(key);
    if (!pending) {
      pending = nativeFetch(input, init);
      inFlight.set(key, pending);
      const release = () => inFlight.delete(key);
      pending.then(release, release);
    }
    // The shared response is never read directly; each caller reads its own clone
    return pending.then((res) => res.clone());
  };
}
