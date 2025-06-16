import { PostHogProvider as WebPostHogProvider } from "posthog-js/react";
import { apiHost, apiKey, debug } from "./postHogOptions";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return apiKey == null ? (
    children
  ) : (
    <WebPostHogProvider apiKey={apiKey} options={{ api_host: apiHost, debug }}>
      {children}
    </WebPostHogProvider>
  );
}
