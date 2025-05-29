import Color from "color";
import type { ComponentRef } from "react";
import { forwardRef, useMemo } from "react";
import type { ColorValue, ViewProps } from "react-native";
import { Pressable, View } from "react-native";
import { hapticImpactIfMobile } from "../hooks/hapticImpactIfMobile";
import type { PropsOf } from "./types";

export type RectButtonProps = {
  borderRadius?: number;
  borderWidth?: number;
  thickness?: number;
  color?: ColorValue;
  accentColor?: ColorValue;
  children?: ViewProps[`children`];
} & Omit<PropsOf<typeof Pressable>, `children`>;

export const RectButton = forwardRef<
  ComponentRef<typeof Pressable>,
  RectButtonProps
>(function RectButton(
  {
    thickness = 4,
    borderRadius = 16,
    borderWidth = 0,
    color = `#1CB0F5`,
    accentColor,
    children,
    ...pressableProps
  },
  ref,
) {
  accentColor = useMemo(
    () => accentColor ?? Color(color).darken(0.2).hex(),
    [accentColor, color],
  );

  // The border contributes to the same *thickness* appearance, so to avoid
  // doubling up, we subtract it.
  thickness = thickness - borderWidth;

  return (
    <Pressable
      {...pressableProps}
      onPressIn={(e) => {
        hapticImpactIfMobile();
        pressableProps.onPressIn?.(e);
      }}
      ref={ref}
    >
      {({ pressed }) => (
        <View
          style={{
            flexGrow: 1,
            flexShrink: 1,
            backgroundColor: accentColor,
            borderRadius,
          }}
        >
          {/* <View
              // thickness
              style={[
                {
                  backgroundColor: accentColor,
                  opacity: pressed ? 0 : 1,
                  height: thickness,
                  position: "absolute",
                  transform: [{ translateY: -thickness }],
                },
              ]}
            /> */}

          <View
            // top surface
            style={[
              {
                borderWidth,
                borderColor: accentColor,
                backgroundColor: color,
                flexGrow: 1,
                flexShrink: 1,
                alignItems: `center`,
                justifyContent: `center`,
                borderRadius,
                padding: 10,
                transform: [{ translateY: pressed ? 0 : -thickness }],
                transformOrigin: `top`,
              },
            ]}
          >
            {children}
          </View>
        </View>
      )}
    </Pressable>
  );
});
