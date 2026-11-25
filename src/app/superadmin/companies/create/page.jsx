'use client';

import dynamic from 'next/dynamic';
import PageSkeleton from '@/components/common/PageSkeleton';

const View = dynamic(() => import('@/views/superadmin/CompanyCreate'), {
  ssr: false,
  loading: () => <PageSkeleton />
});

export default function Page() {
  return <View />;
}
