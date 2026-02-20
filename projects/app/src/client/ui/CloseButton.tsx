import { RectButton } from "./RectButton";

export const CloseButton = ({
  onPress,
  className,
}: {
  onPress: () => void;
  className?: string;
}) => {
  return (
    <RectButton
      variant="bare"
      iconStart="close"
      iconSize={32}
      onPress={onPress}
      className={`
        size-8 rounded-md p-0 text-fg-loud

        ${className ?? ``}
      `}
    />
  );
};
