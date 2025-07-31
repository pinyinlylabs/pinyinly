import type { RankNumber } from "@/data/skills";
import { View } from "react-native";
import { RankLozenge, SkillTile } from "../../app/(menu)/skills";

export default () => {
  return (
    <>
      {([0, 1, 2, 3, 4] as RankNumber[]).map((rank) => (
        <View key={rank} className="gap-2">
          <RankLozenge rank={rank} />
          {[0, 0.1, 0.5, 0.9].map((completion) => (
            <SkillTile
              key={`${rank}-${completion}`}
              hanziWord={`你好:hello`}
              gloss={`hello`}
              rank={rank}
              completion={completion}
            />
          ))}
        </View>
      ))}
    </>
  );
};
