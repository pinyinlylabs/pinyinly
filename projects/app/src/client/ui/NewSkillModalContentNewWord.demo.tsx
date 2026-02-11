import { NewSkillModalContentNewWord } from "@/client/ui/NewSkillModalContentNewWord";
import type { HanziText } from "@/data/model";
import { View } from "react-native";
import { useDemoHanziKnob } from "./demo/utils";

export default () => {
  const { hanzi } = useDemoHanziKnob(`好` as HanziText);

  return (
    <View className="h-[600] w-[500]">
      <NewSkillModalContentNewWord hanzi={hanzi} onDismiss={() => null} />
    </View>
  );
};
