import Color from "color";
import { Image } from "expo-image";
import type { ComponentRef } from "react";
import { forwardRef, useMemo } from "react";
import type { ColorValue } from "react-native";
import { Pressable, View } from "react-native";
import { hapticImpactIfMobile } from "../hooks/hapticImpactIfMobile";
import type { PropsOf } from "./types";

export type CircleButtonProps = {
  thickness?: number;
  scaleY?: number;
  diameter?: number;
  color?: ColorValue;
} & PropsOf<typeof Pressable>;

export const CircleButton = forwardRef<
  ComponentRef<typeof Pressable>,
  CircleButtonProps
>(function CircleButton(
  {
    thickness = 10,
    scaleY = 0.8,
    diameter = 80,
    color = `#1CB0F5`,
    ...pressableProps
  },
  ref,
) {
  const baseColor = useMemo(() => Color(color).darken(0.2).hex(), [color]);

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
          style={[
            {
              width: diameter,
              height: diameter * scaleY + thickness,
            },
          ]}
        >
          <View
            // base
            style={[
              {
                backgroundColor: baseColor,
                alignItems: `center`,
                justifyContent: `center`,
                borderRadius: diameter / 2,
                width: diameter,
                height: diameter,
                opacity: pressed ? 0 : 1,
                position: `absolute`,
                top: thickness,
                transform: [{ scaleY }],
                transformOrigin: `top`,
              },
            ]}
          />
          <View
            // thickness
            style={[
              {
                backgroundColor: baseColor,
                width: diameter,
                opacity: pressed ? 0 : 1,
                height: thickness,
                position: `absolute`,
                top: thickness + (diameter * scaleY) / 2,
                transform: [{ translateY: -thickness }],
              },
            ]}
          />
          <View
            // top surface
            style={[
              {
                backgroundColor: color,
                // opacity: 0.5,
                alignItems: `center`,
                justifyContent: `center`,
                borderRadius: diameter / 2,
                width: diameter,
                height: diameter,
                position: `absolute`,
                top: pressed ? thickness : 0,
                transform: [{ scaleY }],
                transformOrigin: `top`,
              },
            ]}
          >
            <Image
              source={require(`./star.svg`)}
              style={{ width: diameter * 0.6, height: diameter * 0.6 }}
            />
          </View>
        </View>
      )}
    </Pressable>
  );
});
