'use client';

import dynamic from 'next/dynamic';

const AppLayout = dynamic(() => import('@/layouts/AppLayout'), {
  ssr: false,
  loading: () => (
    <div className="page-loading-wrapper">
      <div className="loading-spinner"></div>
    </div>
  )
});

export default function Layout({ children }) {
  return <AppLayout>{children}</AppLayout>;
}
