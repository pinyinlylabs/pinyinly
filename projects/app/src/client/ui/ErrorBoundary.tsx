/* oxlint-disable typescript/unbound-method */
import * as Sentry from "@sentry/react-native";
import * as Updates from "expo-updates";
import { Link } from "expo-router";
import type { ViewProps } from "react-native";
import { Platform } from "react-native";
import { Icon } from "@/client/ui/Icon";
import { Text } from "@/client/ui/Text";
import { View } from "@/client/ui/View";
import { RectButton } from "./RectButton";

export const ErrorBoundary = ({ children }: Pick<ViewProps, `children`>) => {
  return (
    <Sentry.ErrorBoundary fallback={() => <ErrorBoundaryErrorScreen />}>
      {children}
    </Sentry.ErrorBoundary>
  );
};

export function ErrorBoundaryErrorScreen() {
  function reload() {
    if (Platform.OS === `web`) {
      window.location.reload();
    } else {
      void Updates.reloadAsync();
    }
  }

  return (
    <View className="flex-1 bg-bg px-6">
      <View className="flex-1 items-center justify-center pb-8">
        <View className="w-full max-w-[32rem] items-center">
          <View className="mb-5 size-16 items-center justify-center rounded-full bg-fg/5">
            <Icon
              icon="circle-warning"
              size={32}
              tintColorClassName="accent-muted-fg"
            />
          </View>
          <Text variant="h3" className="text-center text-fg">
            Something went wrong
          </Text>
          <Text className="mt-3 max-w-[28rem] text-center leading-6 text-muted-fg">
            We ran into a problem loading Pinyinly. Reload the app to get back
            to learning.
          </Text>
          <View className="mt-10 w-full max-w-[24rem] gap-3">
            <RectButton
              className="w-full normal-case"
              onPress={reload}
              variant="filled"
            >
              Reload Pinyinly
            </RectButton>
            <Link dismissTo href="/learn" asChild>
              <RectButton className="w-full normal-case" variant="bareDim">
                Go to home
              </RectButton>
            </Link>
          </View>
        </View>
      </View>
    </View>
  );
}
