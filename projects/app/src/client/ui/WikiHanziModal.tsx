import type { HanziText } from "@/data/model";
import { devToolsSlowQuerySleepIfEnabled } from "@/util/devtools";
import { useRouter } from "expo-router";
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
  const router = useRouter();

  return (
    <PageSheetModal
      onDismiss={onDismiss}
      devUiSnapshotMode={devUiSnapshotMode}
      suspenseFallback={null}
    >
      {({ dismiss }) => (
        <WikiHanziModalImpl
          hanzi={hanzi}
          onDismiss={dismiss}
          onExpand={() => {
            onDismiss();
            router.push(`/wiki/${encodeURIComponent(hanzi)}`);
          }}
        />
      )}
    </PageSheetModal>
  );
};

const WikiHanziModalImpl = lazy(async () => {
  await devToolsSlowQuerySleepIfEnabled();

  const { WikiHanziModalImpl } = await import(`./WikiHanziModalImpl`);
  return { default: WikiHanziModalImpl };
});
