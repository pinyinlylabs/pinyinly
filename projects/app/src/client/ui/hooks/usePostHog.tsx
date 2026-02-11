import type { UsePostHog } from "@/client/ui/PostHogProvider.utils";
import { usePostHog as rnUsePostHog } from "posthog-react-native";

export function usePostHog(): UsePostHog {
  const posthog = rnUsePostHog();
  return posthog;
}
