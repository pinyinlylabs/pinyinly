import { NewSkillModal } from "@/client/ui/NewSkillModal";
import {
  hanziWordToGloss,
  hanziWordToPinyinFinal,
  hanziWordToPinyinInitial,
  hanziWordToPinyinTone,
  hanziWordToPinyinTyped,
} from "@/data/skills";
import { View } from "react-native";

export default () => {
  return (
    <>
      <View>
        <NewSkillModal
          skill={hanziWordToPinyinTyped(`你好:hello`)}
          devUiSnapshotMode
        />
      </View>
      <View>
        <NewSkillModal
          skill={hanziWordToPinyinInitial(`你好:hello`)}
          devUiSnapshotMode
        />
      </View>
      <View>
        <NewSkillModal
          skill={hanziWordToPinyinFinal(`你好:hello`)}
          devUiSnapshotMode
        />
      </View>
      <View>
        <NewSkillModal
          skill={hanziWordToPinyinTone(`你好:hello`)}
          devUiSnapshotMode
        />
      </View>
      <View>
        <NewSkillModal
          skill={hanziWordToGloss(`你好:hello`)}
          devUiSnapshotMode
        />
      </View>
    </>
  );
};
