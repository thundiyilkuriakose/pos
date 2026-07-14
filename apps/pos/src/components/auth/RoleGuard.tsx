// ════════════════════════════════════════════
//  Role Guard Route Wrapper
//  File: apps/pos/src/components/auth/RoleGuard.tsx
// ════════════════════════════════════════════

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore, UserRole } from '../../stores/auth.store.ts';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

export default function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const user = useAuthStore((state) => state.user);

  // If user role is not permitted (e.g. 'staff'), intercept & redirect to /dashboard
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
