'use client';

import dynamic from 'next/dynamic';

const View = dynamic(() => import('@/views/Login'), {
  ssr: false,
  loading: () => (
    <div className="page-loading-wrapper">
      <div className="loading-spinner"></div>
    </div>
  )
});

export default function Page() {
  return <View />;
}
