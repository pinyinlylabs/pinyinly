import { WikiHanziWordModal } from "@/client/ui/WikiHanziWordModal";

export default () => {
  return (
    <WikiHanziWordModal
      devUiSnapshotMode
      hanziWord={`你好:hello`}
      onDismiss={() => null}
    />
  );
};
