import { WikiHanziModal } from "@/client/ui/WikiHanziModal";
import type { HanziText } from "@/data/model";

export default () => {
  return (
    <WikiHanziModal
      devUiSnapshotMode
      hanzi={`上` as HanziText}
      onDismiss={() => null}
    />
  );
};
