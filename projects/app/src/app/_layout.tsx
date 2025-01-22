/* eslint-disable import/first */

// ------------------------------
// Sentry instrumentation setup for react-native (but not API routes).
// ------------------------------

import { captureConsoleIntegration } from "@sentry/core";
import * as Sentry from "@sentry/react-native";
import { isRunningInExpoGo } from "expo";
import * as Updates from "expo-updates";

// Via the guide: https://docs.expo.dev/guides/using-sentry/
const manifest = Updates.manifest;
const metadata = `metadata` in manifest ? manifest.metadata : undefined;
const extra = `extra` in manifest ? manifest.extra : undefined;
const updateGroup =
  metadata && `updateGroup` in metadata ? metadata.updateGroup : undefined;

// Construct a new instrumentation instance. This is needed to communicate between the integration and React
const routingIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: !isRunningInExpoGo(),
});

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enableNativeFramesTracking: !isRunningInExpoGo(), // Tracks slow and frozen frames in the application
  environment: __DEV__ ? `development` : `production`,
  integrations: [
    captureConsoleIntegration() as typeof routingIntegration,
    routingIntegration,
  ],
  tracesSampleRate: 1.0, // Keep in sync with the other Sentry.init()
});

// ------------------------------
// Continue on with the rest of the file as normal. It's important that
// `Sentry.init()` comes first as it hooks into require()/import calls so it
// needs to be very early on in the setup.
// ------------------------------

import { getSessionId } from "@/components/auth";
import { ReplicacheProvider } from "@/components/ReplicacheContext";
import { trpc } from "@/util/trpc";
import { invariant } from "@haohaohow/lib/invariant";
import {
  DefaultTheme,
  Theme as ReactNavigationTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HTTPHeaders, httpLink } from "@trpc/client";
import { useFonts } from "expo-font";
import { Image } from "expo-image";
import { Slot, SplashScreen, useNavigationContainerRef } from "expo-router";
import { cssInterop } from "nativewind";
import { useEffect, useState } from "react";
import { Platform, useColorScheme, View } from "react-native";
import Animated from "react-native-reanimated";
import "../global.css";

{
  // Regression test for
  // https://github.com/getsentry/sentry-react-native/issues/2851#issuecomment-1628559234.
  // The problem happened when calling `Sentry.init` as it presumably resolved
  // to an old version of 'promise'.
  invariant(
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    Promise.allSettled != null,
  );

  const scope = Sentry.getCurrentScope();
  scope.setTag(`expo-update-id`, Updates.updateId);
  scope.setTag(`expo-is-embedded-update`, Updates.isEmbeddedLaunch);
  scope.setTag(`platform-os`, Platform.OS);
  scope.setTag(`platform-version`, Platform.Version);

  if (typeof updateGroup === `string`) {
    scope.setTag(`expo-update-group-id`, updateGroup);

    const owner = extra?.expoClient?.owner ?? `[account]`;
    const slug = extra?.expoClient?.slug ?? `[project]`;
    scope.setTag(
      `expo-update-debug-url`,
      `https://expo.dev/accounts/${owner}/projects/${slug}/updates/${updateGroup}`,
    );
  } else if (Updates.isEmbeddedLaunch) {
    // This will be `true` if the update is the one embedded in the build, and not one downloaded from the updates server.
    scope.setTag(
      `expo-update-debug-url`,
      `not applicable for embedded updates`,
    );
  }
}

// NativeWind adapters for third party components

// https://discord.com/channels/968718419904057416/1302346762899427390/1302486905656705045
cssInterop(Image, {
  className: { target: `style`, nativeStyleToProp: { color: `tintColor` } },
});
cssInterop(Animated.View, { className: `style` });

function RootLayout() {
  // Capture the NavigationContainer ref and register it with the instrumentation.
  const ref = useNavigationContainerRef();
  const dark = useColorScheme() === `dark`;

  useEffect(() => {
    routingIntegration.registerNavigationContainer(ref);
  }, [ref]);

  const [queryClient] = useState(() => new QueryClient());

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpLink({
          url: `/api/trpc`,

          async headers() {
            const result: HTTPHeaders = {};

            const sessionId = await getSessionId();
            if (sessionId != null) {
              result[`authorization`] = `HhhSessionId ${sessionId}`;
            }

            return result;
          },
        }),
      ],
    }),
  );

  const [fontsLoaded, fontError] = useFonts({
    "MaShanZheng-Regular": require(`@/assets/fonts/MaShanZheng-Regular.ttf`),
    "NotoSerifSC-Medium": require(`@/assets/fonts/NotoSerifSC-Medium.otf`),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch((e: unknown) => {
        console.error(`Could not hide splash screen`, e);
      });
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
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
              } flex-1 bg-background`}
            >
              <Slot />
            </View>
          </ThemeProvider>
        </ReplicacheProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

const BUG_DETECTOR_COLOR = `pink`;

// Wrap the Root Layout route component with `Sentry.wrap` to capture gesture info and profiling data.
export default Sentry.wrap(RootLayout);
