import type { IsExhaustedRest } from "@pinyinly/lib/types";
import { useLayoutEffect, useRef } from "react";
import type { ViewProps } from "react-native";
import { View } from "react-native";
import { tv } from "tailwind-variants";
import { Rive } from "./Rive";
import type { RiveInstance } from "./riveTypes";

interface TutorHeadProps extends Pick<ViewProps, `className` | `style`> {
  exit?: boolean;
}

export const TutorHead = ({
  className,
  exit,
  style,
  ...rest
}: TutorHeadProps) => {
  true satisfies IsExhaustedRest<typeof rest>;

  const riveRef = useRef<RiveInstance>(null);

  useLayoutEffect(() => {
    if (exit === true) {
      riveRef.current?.viewModelInstance?.trigger(`doExit`)?.trigger();
    }
  }, [exit]);

  return (
    <View className={wrapperClass({ className })} style={style}>
      <Rive
        src={require(`@/assets/rive/tutor-head.riv`)}
        artboardName="main"
        stateMachineName="main"
        autoplay
        onRiveLoad={(rive) => {
          riveRef.current = rive;
        }}
        fit="layout"
      />
    </View>
  );
};

const wrapperClass = tv({
  base: `h-[100px] w-[80px]`,
});
