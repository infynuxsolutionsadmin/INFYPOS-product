import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '../types/auth';

interface POSAuthState {
  _hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
  isAuthenticated: boolean; // Means a cashier is clocked in
  isPaired: boolean;
  pairedTenantId: string | null;
  pairedStoreId: string | null;
  user: AuthUser | null;
  permissions: string[];
  setPaired: (tenantId: string, storeId: string, accessToken: string, refreshToken: string) => void;
  setAuth: (user: AuthUser, permissions: string[], accessToken?: string, refreshToken?: string) => void;
  clearAuth: () => void;
  unpairDevice: () => void;
  hasPermission: (permission: string) => boolean;
}

export const useAuthStore = create<POSAuthState>()(
  persist(
    (set, get) => ({
      _hasHydrated: false,
      setHasHydrated: (v) => set({ _hasHydrated: v }),
      isAuthenticated: false,
      isPaired: !!localStorage.getItem('pos_access_token'),
      pairedTenantId: null,
      pairedStoreId: null,
      user: null,
      permissions: [],

      setPaired: (tenantId, storeId, accessToken, refreshToken) => {
        localStorage.setItem('pos_access_token', accessToken);
        localStorage.setItem('pos_refresh_token', refreshToken);
        set({ isPaired: true, pairedTenantId: tenantId, pairedStoreId: storeId });
      },

      setAuth: (user, permissions, accessToken, refreshToken) => {
        if (accessToken && refreshToken) {
          localStorage.setItem('pos_access_token', accessToken);
          localStorage.setItem('pos_refresh_token', refreshToken);
        }
        set({ isAuthenticated: true, user, permissions });
      },

      clearAuth: () => {
        // Just clock out the cashier, keep device paired
        set({ isAuthenticated: false, user: null, permissions: [] });
      },

      unpairDevice: () => {
        localStorage.removeItem('pos_access_token');
        localStorage.removeItem('pos_refresh_token');
        localStorage.removeItem('pos-auth-storage');
        set({ isPaired: false, isAuthenticated: false, user: null, permissions: [], pairedStoreId: null, pairedTenantId: null });
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
        isPaired: state.isPaired,
        pairedTenantId: state.pairedTenantId,
        pairedStoreId: state.pairedStoreId,
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
