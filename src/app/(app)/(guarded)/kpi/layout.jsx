'use client';

// All /kpi/* URLs render the same KPI view; it reads :tab and :id via useParams and stays mounted while tabs change.
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import PageSkeleton from '@/components/common/PageSkeleton';

const View = dynamic(() => import('@/views/KPI'), {
  ssr: false,
  loading: () => <PageSkeleton />
});

export default function Layout({ children }) {
  const pathname = usePathname();
  return Boolean(pathname) ? <View /> : children;
}
