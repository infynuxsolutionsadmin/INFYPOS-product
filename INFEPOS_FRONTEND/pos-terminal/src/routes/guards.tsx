import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useShiftStore } from '../stores/shiftStore';

/** Requires authenticated user. Redirects to /login if not. */
export const RequireAuth: React.FC = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  if (!hasHydrated) {
    // Waiting for Zustand persist to rehydrate — show nothing (brief flash prevention)
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

/** Requires an open shift. Redirects to /open-shift if no active shift. */
export const RequireShift: React.FC = () => {
  const isShiftOpen = useShiftStore((s) => s.isShiftOpen);
  const shiftHydrated = useShiftStore((s) => s._hasHydrated);

  if (!shiftHydrated) {
    return null;
  }

  if (!isShiftOpen()) {
    return <Navigate to="/open-shift" replace />;
  }

  return <Outlet />;
};
