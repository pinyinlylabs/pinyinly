import type { HanziText } from "@/data/model";
import { WikiHanziBody } from "./WikiHanziBody";
import { View } from "react-native";

export function WikiHanziPageImpl({ hanzi }: { hanzi: HanziText }) {
  return (
    <View className="pb-10">
      <WikiHanziBody hanzi={hanzi} />
    </View>
  );
}
