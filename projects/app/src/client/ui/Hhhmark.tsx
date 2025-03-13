import { useMemo } from "react";
import { Text, View } from "react-native";

export const Hhhmark = ({ source }: { source: string }) => {
  const rendered = useMemo(() => {
    return source.replaceAll(`'`, `’`).replaceAll(/"([^"]*)"/g, `“$1”`);
  }, [source]);

  return (
    <View role="button" data-hello testID="foo">
      <Text>{rendered}</Text>
    </View>
  );
};
