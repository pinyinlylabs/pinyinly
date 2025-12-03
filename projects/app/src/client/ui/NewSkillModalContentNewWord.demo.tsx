import { useDemoHanziKnob } from "@/client/ui/demo/helpers";
import { NewSkillModalContentNewWord } from "@/client/ui/NewSkillModalContentNewWord";
import type { HanziText } from "@/data/model";
import { View } from "react-native";

export default () => {
  const { hanzi } = useDemoHanziKnob(`好` as HanziText);

  return (
    <View className="h-[600] w-[500]">
      <NewSkillModalContentNewWord hanzi={hanzi} onDismiss={() => null} />
    </View>
  );
};
