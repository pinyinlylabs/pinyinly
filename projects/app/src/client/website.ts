import { create } from "zustand";

interface WebsiteState {
  isBodyGetStartedVisible: boolean;
  setIsBodyGetStartedVisible: (visible: boolean) => void;
}

export const useWebsiteStore = create<WebsiteState>((set) => ({
  isBodyGetStartedVisible: false,
  setIsBodyGetStartedVisible: (visible: boolean) => {
    set({ isBodyGetStartedVisible: visible });
  },
}));
