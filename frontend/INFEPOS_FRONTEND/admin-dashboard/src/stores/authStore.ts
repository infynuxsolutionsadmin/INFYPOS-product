import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '../types/auth';

interface AuthState {
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  isAuthenticated: boolean;
  user: AuthUser | null;
  permissions: string[];
  setAuth: (user: AuthUser, permissions: string[], token: string, refreshToken: string) => void;
  clearAuth: () => void;
  hasPermission: (permission: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),
      isAuthenticated: !!localStorage.getItem('access_token'),
      user: null, // Hydrated by persist middleware
      permissions: [], // Hydrated by persist middleware
      
      setAuth: (user, permissions, token, refreshToken) => {
        localStorage.setItem('access_token', token);
        localStorage.setItem('refresh_token', refreshToken);
        set({ isAuthenticated: true, user, permissions });
      },
      
      clearAuth: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('auth-storage');
        set({ isAuthenticated: false, user: null, permissions: [] });
      },

      hasPermission: (permission: string) => {
        return get().permissions.includes(permission);
      }
    }),
    {
      name: 'auth-storage', // name of the item in the storage (must be unique)
      partialize: (state) => ({ user: state.user, permissions: state.permissions, isAuthenticated: state.isAuthenticated }),
      onRehydrateStorage: () => (state) => {
        if (state) state.setHasHydrated(true);
      },
    }
  )
);
