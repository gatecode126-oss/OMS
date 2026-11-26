/**
 * @file src/lib/clientEnv.js
 * @description Browser runtime globals (formerly set at the top of the Vite main.jsx).
 * Must be the first import of the client root so every module sees them.
 */
import './polyfill';
// Identical API reads in flight at the same time share one request (reads window.API_URL per call)
import './dedupeFetch';

if (typeof window !== 'undefined') {
  // When server.js serves both the web app and the API (one host), the API is same-origin.
  // When the web app is hosted separately (e.g. Vercel) set NEXT_PUBLIC_API_URL to the
  // backend's URL (the old VITE_API_URL name is accepted too — see next.config.mjs).
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.OMS_API_URL || window.location.origin;
  window.API_URL = apiUrl.replace(/\/+$/, '');

  // Socket.IO runs on the API server, so it follows the API host unless set explicitly
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.OMS_SOCKET_URL || window.API_URL;
  window.SOCKET_URL = socketUrl.replace(/\/+$/, '');
}
