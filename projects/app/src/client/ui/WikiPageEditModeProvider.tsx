import { useState } from "react";
import type { PropsWithChildren } from "react";
import { wikiPageEditingUserToggleSetting } from "@/data/userSettings";
import { useUserSettingToggle } from "./hooks/useUserSettingToggle";
import { WikiPageEditModeContext } from "./WikiPageEditModeContext";

export function WikiPageEditModeProvider({ children }: PropsWithChildren) {
  const [isEditMode, setIsEditMode] = useState(false);
  const { isEnabled: isEditPageEnabled } = useUserSettingToggle(
    wikiPageEditingUserToggleSetting,
  );

  return (
    <WikiPageEditModeContext.Provider
      value={{ isEditPageEnabled, isEditMode, setIsEditMode }}
    >
      {children}
    </WikiPageEditModeContext.Provider>
  );
}
