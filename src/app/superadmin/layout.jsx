'use client';

import dynamic from 'next/dynamic';

const SuperAdminRouteLayout = dynamic(() => import('@/layouts/SuperAdminRouteLayout'), {
  ssr: false,
  loading: () => (
    <div className="page-loading-wrapper">
      <div className="loading-spinner"></div>
    </div>
  )
});

export default function Layout({ children }) {
  return <SuperAdminRouteLayout>{children}</SuperAdminRouteLayout>;
}
