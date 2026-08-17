import { DefaultTheme, ThemeProvider } from "expo-router";
import type { ReactNode } from "react";
import { useColorScheme, View } from "react-native";
import { VisualViewportCssVariables } from "./VisualViewportCssVariables";
import { Theme } from "./Theme";

export function PylyThemeProvider({ children }: { children: ReactNode }) {
  const isDarkMode = useColorScheme() === `dark`;

  return (
    <ThemeProvider
      // Even though this looks like an no-op layout—it's not, and it ensures the
      // top and bottom of the app have the correct color.
      value={{
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
      }}
    >
      <Theme theme={isDarkMode ? `dark` : `light`}>
        <View className="flex-1 bg-bg">
          {children}
          <VisualViewportCssVariables />
        </View>
      </Theme>
    </ThemeProvider>
  );
}

const BUG_DETECTOR_COLOR = `#ff0000`;
