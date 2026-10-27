import type { HanziText } from "@/data/model";
import { View } from "@/client/ui/View";
import { WikiHanziBody } from "./WikiHanziBody";

export function WikiHanziPageImpl({ hanzi }: { hanzi: HanziText }) {
  return (
    <View
      className={`
        pt-3 pb-10

        sm:pt-7
      `}
    >
      <WikiHanziBody hanzi={hanzi} />
    </View>
  );
}
