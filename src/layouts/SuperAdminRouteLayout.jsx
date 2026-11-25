'use client';

/**
 * @file src/layouts/SuperAdminRouteLayout.jsx
 * @description Super Admin console frame: session check + super-admin-only role check + console layout.
 */

import React from 'react';
import { AuthGuard, RoleGuard } from '@/components/common/Guards';
import SuperAdminLayout from '@/views/superadmin/SuperAdminLayout';
import { OutletProvider } from '@/lib/router';

const SUPER_ADMIN_ROLES = ['super_admin', 'SuperAdmin'];

export default function SuperAdminRouteLayout({ children }) {
  return (
    <AuthGuard>
      <RoleGuard allowedRoles={SUPER_ADMIN_ROLES}>
        <OutletProvider outlet={children}>
          <SuperAdminLayout />
        </OutletProvider>
      </RoleGuard>
    </AuthGuard>
  );
}
