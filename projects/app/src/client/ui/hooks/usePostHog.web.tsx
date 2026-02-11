import type { UsePostHog } from "@/client/ui/PostHogProvider.utils";
import { usePostHog as webUsePostHog } from "posthog-js/react";

export function usePostHog(): UsePostHog {
  const posthog = webUsePostHog();
  return posthog;
}
