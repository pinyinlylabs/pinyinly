import { tv } from "tailwind-variants";
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
      className={buttonClass({ className })}
    />
  );
};

const buttonClass = tv({
  base: `size-8 rounded-md p-0 text-fg-loud`,
});
