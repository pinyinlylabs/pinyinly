import { useNavigationContainerRef } from "expo-router";
import { PostHogProvider as RnPostHogProvider } from "posthog-react-native";
import { apiHost, apiKey, debug } from "./PostHogProvider.utils";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const navigationRef = useNavigationContainerRef();

  return (
    <RnPostHogProvider
      apiKey={apiKey}
      autocapture={{
        navigationRef,
        navigation: {
          routeToName: (name) => name,
          // oxlint-disable-next-line typescript/no-unsafe-return
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
