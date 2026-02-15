import { Alert, Platform } from "react-native";

type ConfirmDiscardOptions = {
  onDiscard: () => void;
  title?: string;
  message?: string;
};

const defaultTitle = `Discard changes?`;
const defaultMessage = `You have unsaved edits that will be lost.`;

export function confirmDiscardChanges({
  onDiscard,
  title = defaultTitle,
  message = defaultMessage,
}: ConfirmDiscardOptions) {
  if (Platform.OS === `web`) {
    const confirmFn = globalThis.confirm;
    if (typeof confirmFn === `function` ? confirmFn(message) : true) {
      onDiscard();
    }
    return;
  }

  Alert.alert(title, message, [
    {
      text: `Keep editing`,
      style: `cancel`,
    },
    {
      text: `Discard`,
      style: `destructive`,
      onPress: onDiscard,
    },
  ]);
}
