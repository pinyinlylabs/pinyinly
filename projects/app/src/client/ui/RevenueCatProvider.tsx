import { revenueCat } from "@/client/revenueCat";
import { useEffect } from "react";
import { Platform } from "react-native";
import { useAuth } from "./auth";

const revenueCatApiKey = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY,
  web: process.env.EXPO_PUBLIC_REVENUECAT_WEB_KEY,
});

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
