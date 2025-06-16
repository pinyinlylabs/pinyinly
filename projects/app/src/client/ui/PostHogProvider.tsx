import { useNavigationContainerRef } from "expo-router";
import { PostHogProvider as RnPostHogProvider } from "posthog-react-native";
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
