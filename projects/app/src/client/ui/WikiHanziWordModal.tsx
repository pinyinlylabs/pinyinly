import type { HanziWord } from "@/data/model";
import { devToolsSlowQuerySleepIfEnabled } from "@/util/devtools";
import { lazy } from "react";
import { PageSheetModal } from "./PageSheetModal";

const WikiHanziWordModalImpl = lazy(async () => {
  await devToolsSlowQuerySleepIfEnabled();

  return await import(`./WikiHanziWordModalImpl`).then((x) => ({
    default: x.WikiHanziWordModalImpl,
  }));
});

export const WikiHanziWordModal = ({
  hanziWord,
  onDismiss,
  devUiSnapshotMode,
}: {
  hanziWord: HanziWord;
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
        <WikiHanziWordModalImpl hanziWord={hanziWord} onDismiss={dismiss} />
      )}
    </PageSheetModal>
  );
};
