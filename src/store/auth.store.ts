import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Permission } from '@/types';
import { api } from '@/lib/api-client';

let sessionCheckPromise: Promise<void> | null = null;

// ============================================
// AUTH STORE
// Manages user session, tokens, and permissions.
// Persisted to localStorage/Capacitor Preferences.
// ============================================

type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  isSessionVerified: boolean;
};

type AuthActions = {
  setUser: (user: User) => void;
  clearAuth: () => void;
  checkSession: () => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
};

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isSessionVerified: false,

      setUser: (user) => set({ user, isAuthenticated: true, isSessionVerified: true }),

      clearAuth: () => set({ user: null, isAuthenticated: false, isSessionVerified: false }),

      checkSession: async () => {
        const { isSessionVerified } = get();
        if (isSessionVerified) return;

        if (sessionCheckPromise) return sessionCheckPromise;

        sessionCheckPromise = (async () => {
          try {
            const response = await api.get<{ data: { user: User } }>('/me');
            if (response && response.data && response.data.user) {
              set({ user: response.data.user, isAuthenticated: true, isSessionVerified: true });
            } else {
              set({ user: null, isAuthenticated: false, isSessionVerified: false });
            }
          } catch {
            set({ user: null, isAuthenticated: false, isSessionVerified: false });
          } finally {
            sessionCheckPromise = null;
          }
        })();

        return sessionCheckPromise;
      },

      logout: async () => {
        try {
          await api.post('/logout');
        } finally {
          set({ user: null, isAuthenticated: false, isSessionVerified: false });
        }
      },

      hasPermission: (permission) => {
        const { user } = get();
        if (!user) return false;
        // Admins have all permissions
        if (user.role === 'admin') return true;
        // Check permissions array (handling both enum cases and safety)
        const userPermissions = user.permissions || [];
        return userPermissions.includes(permission);
      },

      hasAnyPermission: (permissions) => {
        const { hasPermission } = get();
        return permissions.some(hasPermission);
      },

      hasAllPermissions: (permissions) => {
        const { hasPermission } = get();
        return permissions.every(hasPermission);
      },
    }),
    {
      name: 'comops-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

// Listen to unauthorized events from API client to clear state automatically
if (typeof window !== 'undefined') {
  window.addEventListener('auth:unauthorized', () => {
    useAuthStore.getState().clearAuth();
  });
}
