'use client';

/**
 * @file src/layouts/AppLayout.jsx
 * @description Authenticated application frame: session check + sidebar/topbar shell.
 * Equivalent of the old `<Route element={<AuthGuard />}><Route element={<AppShell />}>` pair.
 */

import React from 'react';
import { AuthGuard } from '@/components/common/Guards';
import AppShell from '@/components/AppShell';
import { OutletProvider } from '@/lib/router';

export default function AppLayout({ children }) {
  return (
    <AuthGuard>
      <OutletProvider outlet={children}>
        <AppShell />
      </OutletProvider>
    </AuthGuard>
  );
}
