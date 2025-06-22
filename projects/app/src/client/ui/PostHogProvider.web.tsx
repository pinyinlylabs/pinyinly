import { nonNullable } from "@haohaohow/lib/invariant";
import {
  PostHogProvider as WebPostHogProvider,
  usePostHog as webUsePostHog,
} from "posthog-js/react";
import type { UsePostHog } from "./postHogOptions";
import { apiHost, apiKey, debug } from "./postHogOptions";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <WebPostHogProvider
      apiKey={nonNullable(apiKey)}
      options={{
        // Use the Vercel reverse proxy to Posthog in production, but use it
        // directly in local development because the vercel dev server is not
        // used locally, so the proxy won't exist.
        api_host: __DEV__ ? apiHost : `/api/0opho0`,
        ui_host: `https://eu.posthog.com`,
        debug,
        disable_session_recording: true,
      }}
    >
      {children}
    </WebPostHogProvider>
  );
}

export function usePostHog(): UsePostHog {
  const posthog = webUsePostHog();
  return posthog;
}
