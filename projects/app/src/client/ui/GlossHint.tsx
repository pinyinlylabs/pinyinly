import { useMemo } from "react";
import { Text, View } from "react-native";
import { Hhhmark } from "./Hhhmark";

export const GlossHint = ({
  glossHint,
  headlineClassName,
  explanationClassName,
  hideExplanation = false,
}: {
  glossHint: string;
  headlineClassName?: string;
  explanationClassName?: string;
  hideExplanation?: boolean;
}) => {
  const parts = useMemo(() => {
    const lines = glossHint.split(`\n`);
    return { headline: lines[0], explanation: lines[1] };
  }, [glossHint]);

  return (
    <View className="gap-1">
      {parts.headline == null ? null : (
        <Text className={headlineClassName}>
          <Hhhmark source={parts.headline} context="body" />
        </Text>
      )}
      {parts.explanation == null || hideExplanation ? null : (
        <Text className={explanationClassName}>
          <Hhhmark source={parts.explanation} context="body" />
        </Text>
      )}
    </View>
  );
};
