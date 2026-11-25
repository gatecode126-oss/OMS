'use client';

import dynamic from 'next/dynamic';

const GuardedLayout = dynamic(() => import('@/layouts/GuardedLayout'), {
  ssr: false
});

export default function Layout({ children }) {
  return <GuardedLayout>{children}</GuardedLayout>;
}
