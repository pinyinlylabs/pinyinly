import { View } from "@/client/ui/View";
import { Lozenge } from "./Lozenge";

export default () => (
  <View className="flex-row items-center gap-2">
    <Lozenge color="cyan">HSK 2</Lozenge>
    <Lozenge
      kind="icon"
      color="blue"
      icon="bookmark-filled"
      accessibilityLabel="Bookmarked"
      iconTintColorClassName="accent-blue"
    />
    <Lozenge color="violet" progress={0.5}>
      Rank 3
    </Lozenge>
  </View>
);
