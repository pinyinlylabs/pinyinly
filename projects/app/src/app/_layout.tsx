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
import "@/global.css";
import * as Sentry from "@sentry/react-native";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import * as AppleAuthentication from "expo-apple-authentication";
import { Image } from "expo-image";
import { Stack, useNavigationContainerRef } from "expo-router";
import Head from "expo-router/head";
import { cssInterop } from "nativewind";
import { useEffect } from "react";
import type { PropsWithChildren } from "react";
import { Platform } from "react-native";
import Reanimated from "react-native-reanimated";

// NativeWind adapters for third party components

// https://discord.com/channels/968718419904057416/1302346762899427390/1302486905656705045
if (Platform.OS != `web`) {
  // This breaks on web by having errors like:
  //
  // styleq: height typeof 85.83886255924172 is not "string" or "null". styleq:
  // width typeof 128 is not "string" or "null".
  //
  // And passing strings through results in a broken CSS class like `85% 45%`
  // instead of "width-[85%] height-[45%]" (but these classes wouldn't work
  // anyway because they're dynamic and wouldn't be precompiled by tailwind).
  cssInterop(Image, {
    className: { target: `style`, nativeStyleToProp: { color: `tintColor` } },
  });
}
cssInterop(Reanimated.View, { className: `style` });

cssInterop(AppleAuthentication.AppleAuthenticationButton, {
  className: `style`,
});

// oxlint-disable-next-line eslint-plugin-react(only-export-components)
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

            <AudioContextProvider>
              <Stack screenOptions={{ headerShown: false, animation: `fade` }}>
                <Stack.Screen
                  name="login"
                  options={{
                    presentation: `modal`,
                    animation: `slide_from_bottom`,
                  }}
                />
              </Stack>
            </AudioContextProvider>
            <SplashScreen />
          </PostHogProvider>
        </CurrentSessionStoreProvider>
      </DeviceStoreProvider>
    </PylyThemeProvider>
  );
}

// oxlint-disable-next-line eslint-plugin-react(only-export-components)
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
// oxlint-disable-next-line eslint-plugin-react(only-export-components)
export default Sentry.wrap(RootLayout);
