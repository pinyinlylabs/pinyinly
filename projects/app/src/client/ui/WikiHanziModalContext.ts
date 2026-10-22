import { createContext } from "react";

export interface WikiHanziModalContextValue {
  isInWikiHanziModal: true;
}

export const WikiHanziModalContext =
  createContext<WikiHanziModalContextValue | null>(null);
