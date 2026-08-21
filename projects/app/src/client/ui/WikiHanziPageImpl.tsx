import type { HanziText } from "@/data/model";
import { View } from "react-native";
import { WikiHanziBody } from "./WikiHanziBody";

export function WikiHanziPageImpl({ hanzi }: { hanzi: HanziText }) {
  return (
    <View className="pb-10">
      <WikiHanziBody hanzi={hanzi} />
    </View>
  );
}
