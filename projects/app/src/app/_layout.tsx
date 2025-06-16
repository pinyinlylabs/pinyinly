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

import { getSessionId } from "@/client/auth";
import { TrpcProvider } from "@/client/trpc";
import { HhhThemeProvider } from "@/client/ui/HhhThemeProvider";
import { PostHogProvider } from "@/client/ui/PostHogProvider";
import { ReplicacheProvider } from "@/client/ui/ReplicacheContext";
import { SplashScreen } from "@/client/ui/SplashScreen";
import * as Sentry from "@sentry/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Image } from "expo-image";
import { Stack, useNavigationContainerRef } from "expo-router";
import { cssInterop } from "nativewind";
import { useEffect, useState } from "react";
import Reanimated from "react-native-reanimated";
import "../global.css";

// NativeWind adapters for third party components

// https://discord.com/channels/968718419904057416/1302346762899427390/1302486905656705045
cssInterop(Image, {
  className: { target: `style`, nativeStyleToProp: { color: `tintColor` } },
});
cssInterop(Reanimated.View, { className: `style` });

import * as AppleAuthentication from "expo-apple-authentication";
import Head from "expo-router/head";

cssInterop(AppleAuthentication.AppleAuthenticationButton, {
  className: `style`,
});

function RootLayout() {
  // Capture the NavigationContainer ref and register it with the instrumentation.
  const ref = useNavigationContainerRef();

  useEffect(() => {
    routingIntegration.registerNavigationContainer(ref);
  }, [ref]);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            throwOnError: true,
          },
        },
      }),
  );

  return (
    <TrpcProvider queryClient={queryClient} getSessionId={getSessionId}>
      <QueryClientProvider client={queryClient}>
        <ReplicacheProvider>
          <PostHogProvider>
            <HhhThemeProvider>
              <Head>
                <title>haohaohow - Teach yourself Chinese</title>
              </Head>

              <Stack screenOptions={{ headerShown: false, animation: `fade` }}>
                <Stack.Screen
                  name="login"
                  options={{
                    presentation: `modal`,
                    animation: `slide_from_bottom`,
                  }}
                />
              </Stack>
              <SplashScreen />
            </HhhThemeProvider>
          </PostHogProvider>
        </ReplicacheProvider>
      </QueryClientProvider>
    </TrpcProvider>
  );
}

// Wrap the Root Layout route component with `Sentry.wrap` to capture gesture info and profiling data.
export default Sentry.wrap(RootLayout);
