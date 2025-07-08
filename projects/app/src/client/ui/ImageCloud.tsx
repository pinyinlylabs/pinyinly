import type { IsExhaustedRest } from "@/util/types";
import type { ViewProps } from "react-native";
import { View } from "react-native";
import { Rive } from "./Rive";

interface ImageCloudProps extends Pick<ViewProps, `className` | `style`> {
  play?: boolean;
}

export const ImageCloud = ({
  className,
  play = true,
  style,
  ...rest
}: ImageCloudProps) => {
  true satisfies IsExhaustedRest<typeof rest>;

  return (
    <View className={className} style={style}>
      <Rive
        src={require(`@/assets/rive/image-cloud.riv`)}
        artboardName="main"
        assets={{ image: require(`@/assets/illustrations/edge.jpg`) }}
        autoplay
        fit="layout"
        stateMachineName="main"
      />
    </View>
  );
};
