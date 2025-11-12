import type { IsExhaustedRest } from "@pinyinly/lib/types";
import { useRef } from "react";
import type { ViewProps } from "react-native";
import { View } from "react-native";
import { Rive } from "./Rive";
import type { RiveInstance } from "./riveTypes";

interface ThreeSplitLinesDownProps
  extends Pick<ViewProps, `className` | `style`> {
  prop?: never;
}

export const ThreeSplitLinesDown = ({
  className,
  style,
  prop,
  ...rest
}: ThreeSplitLinesDownProps) => {
  true satisfies IsExhaustedRest<typeof rest>;

  const riveRef = useRef<RiveInstance>(null);

  return (
    <View className={className} style={style}>
      <Rive
        src={require(`@/assets/rive/three-split-lines-down.riv`)}
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
