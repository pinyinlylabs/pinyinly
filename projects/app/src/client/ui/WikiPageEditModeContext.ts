import { createContext } from "react";

export type WikiPageEditModeContextValue = {
  isEditPageEnabled: boolean;
  isEditMode: boolean;
  setIsEditMode: (isEditMode: boolean) => void;
};

export const WikiPageEditModeContext =
  createContext<WikiPageEditModeContextValue | null>(null);
