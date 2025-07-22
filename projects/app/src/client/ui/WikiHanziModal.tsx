import type { HanziText } from "@/data/model";
import { devToolsSlowQuerySleepIfEnabled } from "@/util/devtools";
import { lazy, Suspense } from "react";
import { PageSheetModal } from "./PageSheetModal";

const WikiHanziModalImpl = lazy(async () => {
  await devToolsSlowQuerySleepIfEnabled();

  return await import(`./WikiHanziModalImpl`).then((x) => ({
    default: x.WikiHanziModalImpl,
  }));
});

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
    <PageSheetModal onDismiss={onDismiss} devUiSnapshotMode={devUiSnapshotMode}>
      {({ dismiss }) => (
        <Suspense fallback={null}>
          <WikiHanziModalImpl hanzi={hanzi} onDismiss={dismiss} />
        </Suspense>
      )}
    </PageSheetModal>
  );
};
