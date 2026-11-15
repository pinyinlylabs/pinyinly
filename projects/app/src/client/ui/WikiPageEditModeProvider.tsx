import { useState } from "react";
import type { PropsWithChildren } from "react";
import { WikiPageEditModeContext } from "./WikiPageEditModeContext";

export function WikiPageEditModeProvider({ children }: PropsWithChildren) {
  const [isEditMode, setIsEditMode] = useState(false);

  return (
    <WikiPageEditModeContext.Provider value={{ isEditMode, setIsEditMode }}>
      {children}
    </WikiPageEditModeContext.Provider>
  );
}
