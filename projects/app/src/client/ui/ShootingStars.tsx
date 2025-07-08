import type { IsExhaustedRest } from "@/util/types";
import { useEffect, useState } from "react";
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

  const [rive, setRive] = useState<RiveInstance>();

  useEffect(() => {
    if (rive && play) {
      rive.viewModelInstance?.trigger(`onSuccess`)?.trigger();
    }
  }, [rive, play]);

  return (
    <View className={className} style={style}>
      <Rive
        src={require(`@/assets/rive/shooting-stars.riv`)}
        artboardName="main"
        autoplay
        fit="layout"
        onRiveLoad={(rive) => {
          setRive(rive);
        }}
        stateMachineName="main"
      />
    </View>
  );
};
