import { NewSkillModalContentNewPronunciation } from "@/client/ui/NewSkillModalContentNewPronunciation";
import type { HanziText } from "@/data/model";
import { useLocalSearchParams, useRouter } from "expo-router";
import { View } from "react-native";

export default () => {
  const { hanzi } = useLocalSearchParams<{ hanzi?: HanziText }>();
  const router = useRouter();

  if (hanzi == null) {
    // Redirect to set a default hanzi. This way the query string is always
    // visible in the URL and it's self documenting if you want to preview a
    // different hanzi.
    router.setParams({ hanzi: `好` });
    return null;
  }

  return (
    <View className="h-[600] w-[500]">
      <NewSkillModalContentNewPronunciation
        hanzi={hanzi}
        onDismiss={() => null}
      />
    </View>
  );
};
