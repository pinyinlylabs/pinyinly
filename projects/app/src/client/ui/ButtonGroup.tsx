import type { ReactNode } from "react";
import { createContext, use } from "react";
import { View } from "react-native";
import { tv } from "tailwind-variants";
import type { ButtonVariant, RectButtonProps } from "./RectButton";
import { RectButton } from "./RectButton";

interface ButtonGroupContextValue {
  defaultButtonVariant: ButtonVariant;
}

const ButtonGroupContext = createContext<ButtonGroupContextValue | null>(null);

function useButtonGroupContext() {
  const context = use(ButtonGroupContext);
  if (context == null) {
    throw new Error(
      `ButtonGroup compound components must be used within a ButtonGroup`,
    );
  }
  return context;
}

export interface ButtonGroupProps {
  children?: ReactNode;
  className?: string;
  defaultButtonVariant?: ButtonVariant;
}

function ButtonGroupRoot({
  children,
  className,
  defaultButtonVariant = `bare2`,
}: ButtonGroupProps) {
  return (
    <ButtonGroupContext.Provider value={{ defaultButtonVariant }}>
      <View className={buttonGroupClass({ className })}>{children}</View>
    </ButtonGroupContext.Provider>
  );
}

export type ButtonGroupButtonProps = Omit<RectButtonProps, `variant`> & {
  variant?: ButtonVariant;
};

function ButtonGroupButton({
  variant,
  ...buttonProps
}: ButtonGroupButtonProps) {
  const { defaultButtonVariant } = useButtonGroupContext();

  return (
    <RectButton variant={variant ?? defaultButtonVariant} {...buttonProps} />
  );
}

export const ButtonGroup = Object.assign(ButtonGroupRoot, {
  Button: ButtonGroupButton,
});

const buttonGroupClass = tv({
  base: `shrink flex-row items-center rounded bg-bg/90 p-0.5`,
});
