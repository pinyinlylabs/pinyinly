import { WikiHanziModal } from "@/client/ui/WikiHanziModal";
import type { HanziText } from "@/data/model";
import { useLocalSearchParams, useRouter } from "expo-router";

export default () => {
  const { hanzi } = useLocalSearchParams<{ hanzi?: HanziText }>();
  const router = useRouter();

  if (hanzi == null) {
    // Redirect to set a default hanzi. This way the query string is always
    // visible in the URL and it's self documenting if you want to preview a
    // different hanzi.
    router.setParams({ hanzi: `上` });
    return null;
  }

  return (
    <WikiHanziModal devUiSnapshotMode hanzi={hanzi} onDismiss={() => null} />
  );
};
