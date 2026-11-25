'use client';

import dynamic from 'next/dynamic';

const BootSplash = () => (
  <div className="page-loading-wrapper" style={{ minHeight: '100vh' }}>
    <div className="loading-spinner"></div>
  </div>
);

// The whole app relies on browser-only state (localStorage session, sockets, WebRTC), exactly
// like the previous client-rendered SPA — so the provider tree renders only in the browser.
const AppProviders = dynamic(() => import('@/layouts/AppProviders'), {
  ssr: false,
  loading: BootSplash
});

export default function ClientRoot({ children }) {
  return <AppProviders>{children}</AppProviders>;
}
