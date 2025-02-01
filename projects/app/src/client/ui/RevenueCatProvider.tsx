import { revenueCat } from "@/client/revenueCat";
import { failFastIfMissingEnvVars } from "@/util/env";
import { invariant } from "@haohaohow/lib/invariant";
import { useEffect } from "react";
import { Platform } from "react-native";
import { useAuth } from "./auth";

const revenueCatApiKey = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY,
  web: process.env.EXPO_PUBLIC_REVENUECAT_WEB_KEY,
});

// In development if RevenueCat API keys are missing it's gracefully ignored to
// reduce dev friction when setting up the project.
if (failFastIfMissingEnvVars) {
  invariant(revenueCatApiKey != null, `missing RevenueCat API key`);
}

export function RevenueCatProvider() {
  const { data } = useAuth();

  // Reconfigure RevenueCat when the user changes, because each user might have
  // a different subscription/entitlements.
  const userId = data?.clientSession.userId ?? null;
  useEffect(() => {
    if (revenueCatApiKey != null) {
      revenueCat.configure({
        apiKey: revenueCatApiKey,
        userId,
      });
    }
  }, [userId]);

  return null;
}
