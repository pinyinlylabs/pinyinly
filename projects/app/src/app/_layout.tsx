/* eslint-disable import/first */

// ------------------------------
// MUST COME FIRST. Sentry instrumentation setup for react-native (but not API
// routes).
// ------------------------------
import { routingIntegration } from "@/client/sentry";

// ------------------------------
// Continue on with the rest of the file as normal. It's important that
// `Sentry.init()` comes first as it hooks into require()/import calls so it
// needs to be very early on in the setup.
// ------------------------------

import { TrpcProvider } from "@/client/trpc";
import { getSessionId } from "@/client/ui/auth";
import { ReplicacheProvider } from "@/client/ui/ReplicacheContext";
import { SplashScreen } from "@/client/ui/SplashScreen";
import {
  DefaultTheme,
  Theme as ReactNavigationTheme,
  ThemeProvider,
} from "@react-navigation/native";
import * as Sentry from "@sentry/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Image } from "expo-image";
import { Slot, useNavigationContainerRef } from "expo-router";
import { cssInterop } from "nativewind";
import { useEffect, useState } from "react";
import { Platform, useColorScheme, View } from "react-native";
import Animated from "react-native-reanimated";
import "../global.css";

// NativeWind adapters for third party components

// https://discord.com/channels/968718419904057416/1302346762899427390/1302486905656705045
cssInterop(Image, {
  className: { target: `style`, nativeStyleToProp: { color: `tintColor` } },
});
cssInterop(Animated.View, { className: `style` });

import * as AppleAuthentication from "expo-apple-authentication";

cssInterop(AppleAuthentication.AppleAuthenticationButton, {
  className: `style`,
});

function RootLayout() {
  // Capture the NavigationContainer ref and register it with the instrumentation.
  const ref = useNavigationContainerRef();
  const dark = useColorScheme() === `dark`;

  useEffect(() => {
    routingIntegration.registerNavigationContainer(ref);
  }, [ref]);

  const [queryClient] = useState(() => new QueryClient());

  return (
    <TrpcProvider queryClient={queryClient} getSessionId={getSessionId}>
      <QueryClientProvider client={queryClient}>
        <ReplicacheProvider>
          <ThemeProvider
            // Even though this looks like an no-op layout—it's not, and it ensures the
            // top and bottom of the app have the correct color.
            value={
              {
                dark: false,
                colors: {
                  background: `transparent`,
                  // We should never see these colors, instead tamagui should
                  // have priority.
                  border: BUG_DETECTOR_COLOR,
                  card: BUG_DETECTOR_COLOR,
                  notification: BUG_DETECTOR_COLOR,
                  primary: BUG_DETECTOR_COLOR,
                  text: BUG_DETECTOR_COLOR,
                },
                fonts: DefaultTheme.fonts,
              } satisfies ReactNavigationTheme
            }
          >
            <View
              className={`${
                // This is the native equivalent of adding a class to the body
                // element, without this the root color scheme is not set.
                Platform.OS !== `web`
                  ? dark
                    ? `dark-theme`
                    : `light-theme`
                  : ``
              } flex-1`}
            >
              <Slot />
              <SplashScreen />
            </View>
          </ThemeProvider>
        </ReplicacheProvider>
      </QueryClientProvider>
    </TrpcProvider>
  );
}

const BUG_DETECTOR_COLOR = `pink`;

// Wrap the Root Layout route component with `Sentry.wrap` to capture gesture info and profiling data.
export default Sentry.wrap(RootLayout);
