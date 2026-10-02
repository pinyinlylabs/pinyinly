import type { IsExhaustedRest } from "@pinyinly/lib/types";
import type { ViewProps } from "react-native";
import { View } from "@/client/ui/View";
import { Rive } from "./Rive";

interface SpeechBubbleProps extends Pick<ViewProps, `className` | `style`> {
  onLoad?: () => void;
}

export const SpeechBubble = ({
  className,
  onLoad,
  style,
  ...rest
}: SpeechBubbleProps) => {
  true satisfies IsExhaustedRest<typeof rest>;

  return (
    <View className={className} style={style}>
      <Rive
        artboardName="main"
        autoplay
        fit="layout"
        onRiveLoad={() => {
          onLoad?.();
        }}
        src={require(`../../assets/rive/speech-bubble.riv`)}
        stateMachineName="main"
      />
    </View>
  );
};
