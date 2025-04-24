import * as Sentry from "@sentry/react-native";
import { Link } from "expo-router";
import type { ViewProps } from "react-native";
import { Text, View } from "react-native";
import { RectButton2 } from "./RectButton2";

export const ErrorBoundary = ({ children }: Pick<ViewProps, `children`>) => {
  return (
    <Sentry.ErrorBoundary
      fallback={
        <View>
          <Text className="hhh-text-title">An error has occurred</Text>
          <Link dismissTo href="/learn" asChild>
            <RectButton2>Home</RectButton2>
          </Link>
        </View>
      }
    >
      {children}
    </Sentry.ErrorBoundary>
  );
};
