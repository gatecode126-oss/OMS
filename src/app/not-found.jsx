'use client';

import { Navigate } from '@/lib/router';

// Unknown URL → back to "/" (previously `<Route path="*" element={<Navigate to="/" replace />} />`)
export default function NotFound() {
  return <Navigate to="/" replace />;
}
