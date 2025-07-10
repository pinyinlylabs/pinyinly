import type { IsExhaustedRest } from "@/util/types";
import type { ViewProps } from "react-native";
import { View } from "react-native";
import { tv } from "tailwind-variants";
import { Rive } from "./Rive";

interface TutorHeadProps extends Pick<ViewProps, `className` | `style`> {
  onLoad?: () => void;
}

export const TutorHead = ({
  className,
  onLoad,
  style,
  ...rest
}: TutorHeadProps) => {
  true satisfies IsExhaustedRest<typeof rest>;

  return (
    <View className={wrapperClass({ className })} style={style}>
      <Rive
        src={require(`@/assets/rive/tutor-head.riv`)}
        artboardName="main"
        autoplay
        onRiveLoad={() => {
          onLoad?.();
        }}
        fit="layout"
      />
    </View>
  );
};

const wrapperClass = tv({
  base: `h-[100px] w-[80px]`,
});
