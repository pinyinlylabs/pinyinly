import { PostHogProvider as WebPostHogProvider } from "posthog-js/react";
import { apiHost, apiKey, debug } from "./postHogOptions";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return apiKey == null ? (
    children
  ) : (
    <WebPostHogProvider
      apiKey={apiKey}
      options={{
        // Use the Vercel reverse proxy to Posthog in production, but use it
        // directly in local development because the vercel dev server is not
        // used locally, so the proxy won't exist.
        api_host: __DEV__ ? apiHost : `/api/0opho0`,
        ui_host: `https://eu.posthog.com`,
        debug,
      }}
    >
      {children}
    </WebPostHogProvider>
  );
}
