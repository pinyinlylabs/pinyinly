import { createContext } from "react";

export type WikiPageEditModeContextValue = {
  isEditMode: boolean;
  setIsEditMode: (isEditMode: boolean) => void;
};

export const WikiPageEditModeContext =
  createContext<WikiPageEditModeContextValue | null>(null);
