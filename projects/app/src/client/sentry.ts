/* eslint-disable import/first */

import { captureConsoleIntegration } from "@sentry/core";
import * as Sentry from "@sentry/react-native";
import { isRunningInExpoGo } from "expo";
import * as Updates from "expo-updates";

// Construct a new instrumentation instance. This is needed to communicate between the integration and React
export const routingIntegration = Sentry.reactNavigationIntegration({
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

import { invariant } from "@haohaohow/lib/invariant";
import { Platform } from "react-native";

{
  // Regression test for
  // https://github.com/getsentry/sentry-react-native/issues/2851#issuecomment-1628559234.
  // The problem happened when calling `Sentry.init` as it presumably resolved
  // to an old version of 'promise'.
  invariant(
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    Promise.allSettled != null,
  );
}

// Populate the scope with Expo specific information.
{
  const scope = Sentry.getCurrentScope();
  scope.setTag(`expo-update-id`, Updates.updateId);
  scope.setTag(`expo-is-embedded-update`, Updates.isEmbeddedLaunch);
  scope.setTag(`platform-os`, Platform.OS);
  scope.setTag(`platform-version`, Platform.Version);

  // Via the guide: https://docs.expo.dev/guides/using-sentry/
  const manifest = Updates.manifest;
  const metadata = `metadata` in manifest ? manifest.metadata : undefined;
  const extra = `extra` in manifest ? manifest.extra : undefined;
  const updateGroup =
    metadata && `updateGroup` in metadata ? metadata.updateGroup : undefined;

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
