/**
 * @file src/lib/clientEnv.js
 * @description Browser runtime globals (formerly set at the top of the Vite main.jsx).
 * Must be the first import of the client root so every module sees them.
 */
import './polyfill';

if (typeof window !== 'undefined') {
  // Web app and API are served from the same origin by server.js; override only when
  // the API runs on another host.
  window.API_URL = process.env.NEXT_PUBLIC_API_URL || window.location.origin;
  window.SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;
}
