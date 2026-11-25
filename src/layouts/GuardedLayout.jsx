'use client';

/**
 * @file src/layouts/GuardedLayout.jsx
 * @description Role/permission check for every module page (old `<Route element={<RoleGuard />}>`).
 */

import React from 'react';
import { RoleGuard } from '@/components/common/Guards';

export default function GuardedLayout({ children }) {
  return <RoleGuard>{children}</RoleGuard>;
}
