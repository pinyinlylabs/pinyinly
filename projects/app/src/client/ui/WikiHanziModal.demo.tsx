import { useDemoHanzi } from "@/client/hooks/useDemoHanzi";
import { WikiHanziModal } from "@/client/ui/WikiHanziModal";
import type { HanziText } from "@/data/model";

export default () => {
  const hanzi = useDemoHanzi(`上` as HanziText);

  return (
    <WikiHanziModal devUiSnapshotMode hanzi={hanzi} onDismiss={() => null} />
  );
};
