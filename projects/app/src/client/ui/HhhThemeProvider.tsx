import type { Theme as ReactNavigationTheme } from "@react-navigation/native";
import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import type { ReactNode } from "react";
import { Platform, useColorScheme, View } from "react-native";
import { tv } from "tailwind-variants";
import { VisualViewportCssVariables } from "./VisualViewportCssVariables";

export function HhhThemeProvider({ children }: { children: ReactNode }) {
  const isDarkMode = useColorScheme() === `dark`;

  return (
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
        className={containerClass({ isWeb: Platform.OS === `web`, isDarkMode })}
      >
        {children}
        <VisualViewportCssVariables />
      </View>
    </ThemeProvider>
  );
}

const containerClass = tv({
  base: `flex-1 bg-background`,
  variants: {
    isWeb: {
      false: `theme-default`,
    },
    isDarkMode: {
      true: ``,
    },
  },
  compoundVariants: [
    // These are the native equivalent of adding a class to the body
    // element, without this the root color scheme is not set.
    {
      isWeb: false,
      isDarkMode: true,
      class: `hhh-color-scheme-dark`,
    },
    {
      isWeb: false,
      isDarkMode: false,
      class: `hhh-color-schema-light`,
    },
  ],
});

const BUG_DETECTOR_COLOR = `#ff0000`;
