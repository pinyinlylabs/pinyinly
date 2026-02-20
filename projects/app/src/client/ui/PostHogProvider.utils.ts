import type { usePostHog as webUsePostHog } from "posthog-js/react";
import type { usePostHog as rnUsePostHog } from "posthog-react-native";

// Set this to true to turn on debug console logs for PostHog. They output via
// `console.log()` so you can see them in the browser console.
export const debug = false;
export const apiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
export const apiHost = `https://eu.i.posthog.com`;

type WebPostHog = ReturnType<typeof rnUsePostHog>;
type RnPostHog = ReturnType<typeof webUsePostHog>;

type RnPostHogCaptureEventName = Parameters<RnPostHog[`capture`]>[`0`];
type WebPostHogCaptureProperties = Parameters<WebPostHog[`capture`]>[`1`];

export interface UsePostHog {
  capture: (
    event: RnPostHogCaptureEventName,
    properties?: WebPostHogCaptureProperties,
  ) => void;
}

// Type check to make sure the props are truly common to both implementations.
