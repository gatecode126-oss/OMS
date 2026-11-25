'use client';

import React from 'react';
import Skeleton from './Skeleton';

/**
 * Page-level loading placeholder shown while a route's code loads.
 * (Same markup the AppShell used as its <Suspense> fallback.)
 */
const PageSkeleton = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
    <Skeleton variant="rect" height={40} width={300} />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)' }}>
      <Skeleton variant="rect" height={100} />
      <Skeleton variant="rect" height={100} />
      <Skeleton variant="rect" height={100} />
      <Skeleton variant="rect" height={100} />
    </div>
    <Skeleton variant="rect" height={220} />
    <Skeleton variant="text" count={4} />
  </div>
);

export default PageSkeleton;
