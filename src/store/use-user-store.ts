// user-store.ts
import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";
import { useMemo } from "react";
import {
  AUTH_STORAGE_KEYS,
  AuthStore,
  User,
} from "@/features/auth/interface/auth.interface";
import { secureStorage } from "@/lib/secure-storage";

/**
 * Zustand Auth Store with full encryption
 */
export const useUserStore = create<AuthStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        hydrated: false,
        isInitiallyGuest: true,
        setHydrated: (value: boolean) => set({ hydrated: value }),

        // Actions
        setUser: (user) => {
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
            isLoading: false,
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
        version: 1,
        partialize: (state) => state,
        storage: {
          getItem: (name) => {
            const data = secureStorage.getItem(name);
            if (!data) return null;
            return JSON.parse(data); // Zustand expects JSON-parsed data
          },
          setItem: (name, value) => {
            const serialized = JSON.stringify(value);
            secureStorage.setItem(name, serialized);
          },
          removeItem: (name) => secureStorage.removeItem(name),
        },
        onRehydrateStorage: () => (state) => {
          if (state) {
            state.hydrated = true;
            state.isInitiallyGuest = false;
          }
        },
      }
    )
  )
);

/**
 * Direct store access
 */
export const userStore = {
  getState: () => useUserStore.getState(),
  setState: useUserStore.setState,
  subscribe: useUserStore.subscribe,
  setUser: (user: User | null) => useUserStore.getState().setUser(user),
  clearUser: () => useUserStore.getState().clearUser(),
  setLoading: (loading: boolean) => useUserStore.getState().setLoading(loading),
  setError: (error: string | null) => useUserStore.getState().setError(error),
  clearError: () => useUserStore.getState().clearError(),
  login: (user: User) => useUserStore.getState().login(user),
  logout: () => useUserStore.getState().logout(),
  updateProfile: (updates: Partial<User>) =>
    useUserStore.getState().updateProfile(updates),
  setHydrated: (value: boolean) => useUserStore.getState().setHydrated(value),
};

/**
 * React hooks
 */
export const useUser = () => useUserStore((state) => state.user);
export const useIsAuthenticated = () =>
  useUserStore((state) => state.isAuthenticated);
export const useAuthLoading = () => useUserStore((state) => state.isLoading);
export const useAuthError = () => useUserStore((state) => state.error);
export const useHydrated = () => useUserStore((state) => state.hydrated);

export const useUserActions = () => {
  const actions = {
    setUser: useUserStore((state) => state.setUser),
    clearUser: useUserStore((state) => state.clearUser),
    setLoading: useUserStore((state) => state.setLoading),
    setError: useUserStore((state) => state.setError),
    clearError: useUserStore((state) => state.clearError),
    login: useUserStore((state) => state.login),
    logout: useUserStore((state) => state.logout),
    updateProfile: useUserStore((state) => state.updateProfile),
    setHydrated: useUserStore((state) => state.setHydrated),
  };
  return useMemo(() => actions, Object.values(actions));
};

/**
 * Role & verification hooks
 */
export const useIsAdmin = () => useUser()?.role === "ADMIN";
export const useIsSeller = () => {
  const role = useUser()?.role;
  return role === "SELLER" || role === "ADMIN";
};
export const useIsVerified = () => useUser()?.is_verified ?? false;

/**
 * Composite state
 */
export const useUserState = () => {
  const state = useUserStore((s) => ({
    user: s.user,
    isAuthenticated: s.isAuthenticated,
    isLoading: s.isLoading,
    error: s.error,
    hydrated: s.hydrated,
  }));
  return useMemo(() => state, Object.values(state));
};
