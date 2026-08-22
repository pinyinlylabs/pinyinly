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

import { useAuth } from "@/client/auth";
import { AudioContextProvider } from "@/client/ui/AudioContextProvider";
import { DeviceStoreProvider } from "@/client/ui/DeviceStoreProvider";
import { PostHogProvider } from "@/client/ui/PostHogProvider";
import { PylyThemeProvider } from "@/client/ui/PylyThemeProvider";
import { SessionStoreProvider } from "@/client/ui/SessionStoreProvider";
import { SplashScreen } from "@/client/ui/SplashScreen";
import { TooltipProvider } from "@/client/ui/TooltipProvider";
import * as Sentry from "@sentry/react-native";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Stack, useNavigationContainerRef } from "expo-router";
import Head from "expo-router/head";
import type { PropsWithChildren } from "react";
import { useEffect } from "react";
import { PortalHost } from "@rn-primitives/portal";

function RootLayout() {
  // Capture the NavigationContainer ref and register it with the instrumentation.
  const ref = useNavigationContainerRef();

  useEffect(() => {
    routingIntegration.registerNavigationContainer(ref);
  }, [ref]);

  return (
    <PylyThemeProvider>
      <DeviceStoreProvider>
        <CurrentSessionStoreProvider>
          <PostHogProvider>
            <Head>
              <title>Pinyinly - Learn to read Chinese</title>
            </Head>

            <UiProviders>
              <Stack screenOptions={{ headerShown: false, animation: `fade` }}>
                <Stack.Screen
                  name="login"
                  options={{
                    presentation: `modal`,
                    animation: `slide_from_bottom`,
                  }}
                />
              </Stack>
            </UiProviders>
            <SplashScreen />
          </PostHogProvider>
        </CurrentSessionStoreProvider>
      </DeviceStoreProvider>
    </PylyThemeProvider>
  );
}

export function UiProviders({ children }: PropsWithChildren) {
  return (
    <AudioContextProvider>
      <TooltipProvider>{children}</TooltipProvider>
      <PortalHost />
    </AudioContextProvider>
  );
}

function CurrentSessionStoreProvider({ children }: PropsWithChildren) {
  const activeDeviceSession = useAuth().data?.activeDeviceSession;

  return activeDeviceSession == null ? null : (
    <SessionStoreProvider
      dbName={activeDeviceSession.replicacheDbName}
      serverSessionId={activeDeviceSession.serverSessionId}
    >
      <ReactQueryDevtools initialIsOpen />
      {children}
    </SessionStoreProvider>
  );
}

// Wrap the Root Layout route component with `Sentry.wrap` to capture gesture info and profiling data.
// oxlint-disable-next-line react/only-export-components
export default Sentry.wrap(RootLayout);
