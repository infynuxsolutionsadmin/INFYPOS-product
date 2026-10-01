import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '../types/auth';

interface POSAuthState {
  _hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
  isAuthenticated: boolean;
  user: AuthUser | null;
  permissions: string[];
  setAuth: (user: AuthUser, permissions: string[], accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  hasPermission: (permission: string) => boolean;
}

export const useAuthStore = create<POSAuthState>()(
  persist(
    (set, get) => ({
      _hasHydrated: false,
      setHasHydrated: (v) => set({ _hasHydrated: v }),
      isAuthenticated: !!localStorage.getItem('pos_access_token'),
      user: null,
      permissions: [],

      setAuth: (user, permissions, accessToken, refreshToken) => {
        localStorage.setItem('pos_access_token', accessToken);
        localStorage.setItem('pos_refresh_token', refreshToken);
        set({ isAuthenticated: true, user, permissions });
      },

      clearAuth: () => {
        localStorage.removeItem('pos_access_token');
        localStorage.removeItem('pos_refresh_token');
        localStorage.removeItem('pos-auth-storage');
        set({ isAuthenticated: false, user: null, permissions: [] });
      },

      hasPermission: (permission: string) => {
        return get().permissions.includes(permission);
      },
    }),
    {
      name: 'pos-auth-storage', // unique key — does NOT conflict with admin-dashboard 'auth-storage'
      partialize: (state) => ({
        user: state.user,
        permissions: state.permissions,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state.setHasHydrated(true);
      },
    }
  )
);

// Listen for 401 events dispatched by the API client
if (typeof window !== 'undefined') {
  window.addEventListener('pos:unauthorized', () => {
    useAuthStore.getState().clearAuth();
  });
}
