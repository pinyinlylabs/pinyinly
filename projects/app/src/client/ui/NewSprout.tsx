import type { IsExhaustedRest } from "@pinyinly/lib/types";
import type { ViewProps } from "react-native";
import { View } from "@/client/ui/View";
import { Rive } from "./Rive";
import { ScopedVariables } from "./ScopedVariables";

export const NewSprout = ({
  className,
  style,
  ...rest
}: Pick<ViewProps, `className` | `style`>) => {
  true satisfies IsExhaustedRest<typeof rest>;

  return (
    <ScopedVariables variables={{ "--color-fg": `var(--color-success)` }}>
      <View className={className} style={style}>
        <Rive
          src={require(`../../assets/rive/new-sprout.riv`)}
          artboardName="main"
          autoplay
          fit="contain"
          stateMachineName="main"
        />
      </View>
    </ScopedVariables>
  );
};
