import { RectButton } from "./RectButton";

export function WikiEditButton({
  editing,
  onPress,
}: {
  editing: boolean;
  onPress: () => void;
}) {
  return editing ? (
    <RectButton variant="barePrimary" onPress={onPress}>
      Done
    </RectButton>
  ) : (
    <RectButton variant="bareDim" iconStart="pencil" onPress={onPress}>
      Edit
    </RectButton>
  );
}
