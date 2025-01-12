import { getSessionId } from "@/components/auth";
import { ReplicacheProvider } from "@/components/ReplicacheContext";
import { sentryDsn } from "@/env";
import { trpc } from "@/util/trpc";
import {
  DefaultTheme,
  Theme as ReactNavigationTheme,
  ThemeProvider,
} from "@react-navigation/native";
import * as Sentry from "@sentry/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, HTTPHeaders } from "@trpc/client";
import { useFonts } from "expo-font";
import { Image } from "expo-image";
import { Slot, SplashScreen, useNavigationContainerRef } from "expo-router";
import * as Updates from "expo-updates";
import { cssInterop } from "nativewind";
import { useEffect, useState } from "react";
import { Platform, useColorScheme, View } from "react-native";
import Animated from "react-native-reanimated";
import "../global.css";

// Via the guide: https://docs.expo.dev/guides/using-sentry/
const manifest = Updates.manifest;
const metadata = `metadata` in manifest ? manifest.metadata : undefined;
const extra = `extra` in manifest ? manifest.extra : undefined;
const updateGroup =
  metadata && `updateGroup` in metadata ? metadata.updateGroup : undefined;

// Construct a new instrumentation instance. This is needed to communicate between the integration and React
const routingIntegration = Sentry.reactNavigationIntegration();

Sentry.init({
  enabled: !__DEV__,
  dsn: sentryDsn,
  integrations: [routingIntegration],
});

{
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
        httpBatchLink({
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
      SplashScreen.hideAsync().catch((e: unknown) =>
        Sentry.captureException(e),
      );
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
