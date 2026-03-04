import type { AiImageStyleKind } from "@/client/aiImageStyle";
import { normalizeAiImageStyleKind } from "@/client/aiImageStyle";
import { aiImageStyleSetting } from "@/data/userSettings";
import { useUserSetting } from "./useUserSetting";

/**
 * Result returned by useAiImageStyleSetting hook
 */
export interface UseAiImageStyleResult {
  /** The normalized AI image style ('comic' or 'realistic'), defaults to 'comic' if unset */
  aiImageStyle: AiImageStyleKind;
  /** Whether the setting is currently loading */
  isLoading: boolean;
  /** Function to update the AI image style preference */
  setAiImageStyle: (styleKind: AiImageStyleKind) => void;
}

/**
 * Hook to access and update the user's AI image style preference.
 * Returns the normalized style ('comic' or 'realistic') plus loading state and setter.
 */
export function useAiImageStyleSetting(): UseAiImageStyleResult {
  const setting = useUserSetting(aiImageStyleSetting);
  const aiImageStyle = normalizeAiImageStyleKind(setting.value?.text);

  const setAiImageStyle = (styleKind: AiImageStyleKind) => {
    setting.setValue({ text: styleKind });
  };

  return {
    isLoading: setting.isLoading,
    aiImageStyle,
    setAiImageStyle,
  };
}
