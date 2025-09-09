import { useDemoHanzi } from "@/client/ui/demo/helpers";
import { NewSkillModalContentNewPronunciation } from "@/client/ui/NewSkillModalContentNewPronunciation";
import type { HanziText } from "@/data/model";
import { View } from "react-native";

export default () => {
  const hanzi = useDemoHanzi(`好` as HanziText);

  return (
    <View className="h-[600] w-[500]">
      <NewSkillModalContentNewPronunciation
        hanzi={hanzi}
        onDismiss={() => null}
      />
    </View>
  );
};
