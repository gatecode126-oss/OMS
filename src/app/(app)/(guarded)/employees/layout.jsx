'use client';

// /employees and /employees/add render the same Employees view; keeping it in the layout preserves its state when switching between them (as react-router did).
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import PageSkeleton from '@/components/common/PageSkeleton';

const View = dynamic(() => import('@/views/Employees'), {
  ssr: false,
  loading: () => <PageSkeleton />
});

export default function Layout({ children }) {
  const pathname = usePathname();
  return (pathname === '/employees' || pathname === '/employees/add') ? <View /> : children;
}
