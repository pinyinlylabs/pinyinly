import type { HanziText } from "@/data/model";
import { devToolsSlowQuerySleepIfEnabled } from "@/util/devtools";
import { lazy } from "react";
import { PageSheetModal } from "./PageSheetModal";

export const WikiHanziModal = ({
  hanzi,
  onDismiss,
  devUiSnapshotMode,
}: {
  hanzi: HanziText;
  onDismiss: () => void;
  devUiSnapshotMode?: boolean;
}) => {
  return (
    <PageSheetModal
      onDismiss={onDismiss}
      devUiSnapshotMode={devUiSnapshotMode}
      suspenseFallback={null}
    >
      {({ dismiss }) => (
        <WikiHanziModalImpl hanzi={hanzi} onDismiss={dismiss} />
      )}
    </PageSheetModal>
  );
};

const WikiHanziModalImpl = lazy(async () => {
  await devToolsSlowQuerySleepIfEnabled();

  const { WikiHanziModalImpl } = await import(`./WikiHanziModalImpl`);
  return { default: WikiHanziModalImpl };
});
