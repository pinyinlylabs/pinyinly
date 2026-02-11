import { useDeviceStore } from "@/client/ui/hooks/useDeviceStore";
import { betaFeaturesSetting } from "@/util/devtools";

/**
 * Hook to access and control beta features setting.
 *
 * Beta features are enabled by default in development mode (`__DEV__`),
 * but can be toggled via the device store.
 */
export function useBetaFeatures() {
  const { isLoading, value, setValue } = useDeviceStore(betaFeaturesSetting);

  // Default to __DEV__ if no explicit setting exists
  const isEnabled = value?.enabled ?? __DEV__;

  function setIsEnabled(enabled: boolean) {
    setValue({ enabled });
  }

  return {
    isLoading,
    isEnabled,
    setIsEnabled,
  };
}

/**
 * Convenience hook that just returns whether beta features are enabled.
 * Use this in components that only need to check if beta features are on.
 */
export function useIsBetaEnabled(): boolean {
  return useBetaFeatures().isEnabled;
}
