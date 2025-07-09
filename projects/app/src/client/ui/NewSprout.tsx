import type { IsExhaustedRest } from "@/util/types";
import type { ViewProps } from "react-native";
import { View } from "react-native";
import { Rive } from "./Rive";

export const NewSprout = ({
  className,
  style,
  ...rest
}: Pick<ViewProps, `className` | `style`>) => {
  true satisfies IsExhaustedRest<typeof rest>;

  return (
    <View
      className={`
        ${className ?? ``}

        theme-success
      `}
      style={style}
    >
      <Rive
        src={require(`@/assets/rive/new-sprout.riv`)}
        artboardName="main"
        autoplay
        fit="contain"
        stateMachineName="main"
      />
    </View>
  );
};
