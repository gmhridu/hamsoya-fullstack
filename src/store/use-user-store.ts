/**
 * Enhanced Zustand auth store with persistence and optimistic updates
 * Provides instant state updates and seamless auth state management
 */

import {
  AUTH_STORAGE_KEYS,
  AuthStore,
  User,
} from "@/features/auth/interface/auth.interface";
import { secureStorage } from "@/lib/secure-storage";
import { useMemo } from "react";
import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";

export const useUserStore = create<AuthStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,

        setUser: (user) => {
          const currentState = get();
          if (currentState.user === user) {
            return;
          }

          set({
            user,
            isAuthenticated: !!user,
            error: null,
            isLoading: false,
          });
        },

        clearUser: () => {
          set({
            user: null,
            isAuthenticated: false,
            error: null,
          });
        },
        setLoading: (isLoading) => set({ isLoading }),

        setError: (error) => set({ error, isLoading: false }),

        clearError: () => set({ error: null }),

        login: (user) => {
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        },

        logout: () => {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        },

        updateProfile: (updates) => {
          const currentUser = get().user;
          if (currentUser) {
            set({
              user: { ...currentUser, ...updates },
            });
          }
        },
      }),
      {
        name: AUTH_STORAGE_KEYS.user,
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
        }),
        version: 1,
        migrate: (persistedState: any) => {
          return persistedState;
        },
        storage: {
          getItem: (name: string) => {
            return secureStorage.getItem(name);
          },
          setItem: (name: string, value: any) => {
            secureStorage.setItem(name, value, { encrypt: true });
          },
          removeItem: (name: string) => {
            secureStorage.removeItem(name);
          },
        },
      }
    )
  )
);

/**
 * Direct store access for non-React contexts (like API client)
 * Provides imperative API for auth state management outside components
 */

export const userStore = {
  getState: () => useUserStore.getState(),
  setState: useUserStore.setState,
  subscribe: useUserStore.subscribe,

  // Direct action accessors with proper typing
  setUser: (user: User | null) => useUserStore.getState().setUser(user),
  clearUser: () => useUserStore.getState().clearUser(),
  setLoading: (loading: boolean) => useUserStore.getState().setLoading(loading),
  setError: (error: string | null) => useUserStore.getState().setError(error),
  clearError: () => useUserStore.getState().clearError(),
  login: (user: User) => useUserStore.getState().login(user),
  logout: () => useUserStore.getState().logout(),
  updateProfile: (updates: Partial<User>) =>
    useUserStore.getState().updateProfile(updates),
};

/**
 * Optimized selectors for better performance and minimal re-renders
 * Use these instead of accessing the full store to prevent unnecessary updates
 */

export const useUser = () => useUserStore((state) => state.user);
export const useIsAuthenticated = () =>
  useUserStore((state) => state.isAuthenticated);
export const useAuthLoading = () => useUserStore((state) => state.isLoading);
export const useAuthError = () => useUserStore((state) => state.error);

/**
 * Auth actions hook with memoized actions to prevent infinite re-renders
 * Returns stable references to auth actions for use in components
 */

export const useUserActions = () => {
  const setUser = useUserStore((state) => state.setUser);
  const clearUser = useUserStore((state) => state.clearUser);
  const setLoading = useUserStore((state) => state.setLoading);
  const setError = useUserStore((state) => state.setError);
  const clearError = useUserStore((state) => state.clearError);
  const login = useUserStore((state) => state.login);
  const logout = useUserStore((state) => state.logout);
  const updateProfile = useUserStore((state) => state.updateProfile);

  return useMemo(
    () => ({
      setUser,
      clearUser,
      setLoading,
      setError,
      clearError,
      login,
      logout,
      updateProfile,
    }),
    [
      setUser,
      clearUser,
      setLoading,
      setError,
      clearError,
      login,
      logout,
      updateProfile,
    ]
  );
};

/**
 * Helper hooks for role-based access control and user status checks
 * Provide convenient access to user permissions and verification status
 */
export const useIsAdmin = () => {
  const user = useUser();
  return user?.role === "ADMIN";
};

export const useIsSeller = () => {
  const user = useUser();
  return user?.role === "SELLER" || user?.role === "ADMIN";
};

export const useIsVerified = () => {
  const user = useUser();
  return user?.is_verified ?? false;
};


/**
 * Composite auth state selector for components that need multiple auth values
 * Uses individual selectors to prevent infinite loops and optimize performance
 */

export const useUserState = () => {
  const user = useUserStore(state => state.user);
  const isAuthenticated = useUserStore(state => state.isAuthenticated);
  const isLoading = useUserStore(state => state.isLoading);
  const error = useUserStore(state => state.error);

  return useMemo(() => ({
    user,
    isAuthenticated,
    isLoading,
    error
  }), [user, isAuthenticated, isLoading, error])
}
