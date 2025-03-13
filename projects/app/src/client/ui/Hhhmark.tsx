import { useMemo } from "react";
import { Text } from "react-native";

export const Hhhmark = ({ source }: { source: string }) => {
  const rendered = useMemo(() => {
    return source.replaceAll(`'`, `’`).replaceAll(/"([^"]*)"/g, `“$1”`);
  }, [source]);

  return <Text>{rendered}</Text>;
};
