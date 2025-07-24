import { WikiHanziModal } from "@/client/ui/WikiHanziModal";
import type { HanziText } from "@/data/model";

export default () => {
  return (
    <WikiHanziModal
      devUiSnapshotMode
      hanzi={`单` as HanziText}
      onDismiss={() => null}
    />
  );
};
