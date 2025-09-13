import { WikiHanziWordModal } from "@/client/ui/WikiHanziWordModal";
import { useState } from "react";
import { RectButton } from "./RectButton";

export default () => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <RectButton
        variant="filled"
        onPress={() => {
          setShowModal(true);
        }}
      >
        Open Wiki Modal (Test Pull-Down Gesture)
      </RectButton>

      {showModal && (
        <WikiHanziWordModal
          devUiSnapshotMode={false}
          hanziWord={`你好:hello`}
          onDismiss={() => {
            setShowModal(false);
          }}
        />
      )}
    </>
  );
};
