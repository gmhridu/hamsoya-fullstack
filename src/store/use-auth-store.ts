import { create } from "zustand";

type AuthState = {
  activeTab: "login" | "signup";
  setActiveTab: (tab: "login" | "signup") => void;

  profileImageUrl?: string;
  profileImageField?: string;

  setProfileImage: (url?: string, fieldId?: string) => void;
  resetProfileImage: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  activeTab: "login",
  setActiveTab: (tab) => set({ activeTab: tab }),

  profileImageUrl: undefined,
  profileImageField: undefined,

  setProfileImage: (url, fieldId) =>
    set({ profileImageUrl: url, profileImageField: fieldId }),
  resetProfileImage: () =>
    set({ profileImageUrl: undefined, profileImageField: undefined }),
}));
