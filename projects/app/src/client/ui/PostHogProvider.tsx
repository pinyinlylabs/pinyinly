import { useNavigationContainerRef } from "expo-router";
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import {
  PostHogProvider as RnPostHogProvider,
  usePostHog as rnUsePostHog,
} from "posthog-react-native";
import type { UsePostHog } from "./postHogOptions";
import { apiHost, apiKey, debug } from "./postHogOptions";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const navigationRef = useNavigationContainerRef();

  return (
    <RnPostHogProvider
      apiKey={apiKey}
      autocapture={{
        navigationRef,
        navigation: {
          routeToName: (name) => name,
          routeToProperties: (_name, params) => params,
        },
      }}
      debug={debug}
      options={{ host: apiHost }}
    >
      {children}
    </RnPostHogProvider>
  );
}

export function usePostHog(): UsePostHog {
  const posthog = rnUsePostHog();
  return posthog;
}
