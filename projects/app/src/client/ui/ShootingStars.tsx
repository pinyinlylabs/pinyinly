import type { IsExhaustedRest } from "@/util/types";
import { useLayoutEffect, useRef } from "react";
import type { ViewProps } from "react-native";
import { View } from "react-native";
import { Rive } from "./Rive";
import type { RiveInstance } from "./riveTypes";

interface ShootingStarsProps extends Pick<ViewProps, `className` | `style`> {
  play: boolean;
}

export const ShootingStars = ({
  className,
  play,
  style,
  ...rest
}: ShootingStarsProps) => {
  true satisfies IsExhaustedRest<typeof rest>;

  const riveRef = useRef<RiveInstance>(null);

  useLayoutEffect(() => {
    if (play) {
      riveRef.current?.viewModelInstance?.trigger(`onSuccess`)?.trigger();
    }
  }, [play]);

  return (
    <View className={className} style={style}>
      <Rive
        src={require(`@/assets/rive/shooting-stars.riv`)}
        artboardName="main"
        autoplay
        fit="layout"
        onRiveLoad={(rive) => {
          riveRef.current = rive;
        }}
        stateMachineName="main"
      />
    </View>
  );
};
