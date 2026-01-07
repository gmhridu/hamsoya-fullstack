import { create } from "zustand";

interface ProfileImageState {
  fileId: string | null;
  url: string | null;
  isUploaded: boolean;
  setImage: (url: string, fileId: string) => void;
  removeImage: () => void;
  resetProfileImage: () => void;
}

export const useProfileImageStore = create<ProfileImageState>((set) => ({
  fileId: null,
  url: null,
  isUploaded: false,

  setImage: (url, fileId) => set(() => ({ url, fileId, isUploaded: true })),

  removeImage: () => set(() => ({ url: null, fileId: null, isUploaded: false })),

  resetProfileImage: () => set(() => ({ url: "", fileId: "", isUploaded: false })),
}));
