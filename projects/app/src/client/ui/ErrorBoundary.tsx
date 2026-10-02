import * as Sentry from "@sentry/react-native";
import { Link } from "expo-router";
import type { ViewProps } from "react-native";
import { Text } from "@/client/ui/Text";
import { View } from "@/client/ui/View";
import { RectButton } from "./RectButton";

export const ErrorBoundary = ({ children }: Pick<ViewProps, `children`>) => {
  return (
    <Sentry.ErrorBoundary
      fallback={
        <View>
          <Text className="pyly-body-title">An error has occurred</Text>
          <Link dismissTo href="/learn" asChild>
            <RectButton>Home</RectButton>
          </Link>
        </View>
      }
    >
      {children}
    </Sentry.ErrorBoundary>
  );
};
