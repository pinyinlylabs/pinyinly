import type { FloatingMenuModalMenuProps } from "@/client/ui/FloatingMenuModal";
import { FloatingMenuModal } from "@/client/ui/FloatingMenuModal";
import type { PropsWithChildren, ReactElement, RefAttributes } from "react";
import { Children, createContext, isValidElement, use } from "react";
import type { PressableProps, TextProps, ViewProps } from "react-native";
import { Text, View } from "react-native";
import type { RectButtonProps } from "./RectButton";
import { RectButton } from "./RectButton";
import type { IconName } from "./iconRegistry";

type DropdownMenuTriggerElement = ReactElement<
  Pick<PressableProps, `onTouchEnd` | `onPress`> & RefAttributes<View>
>;

type DropdownMenuDescriptorElement = ReactElement<{
  children?: unknown;
}>;

function DropdownMenuRoot({ children }: PropsWithChildren) {
  let triggerElement: DropdownMenuTriggerElement | null = null;
  let contentElement: ReactElement<FloatingMenuModalMenuProps> | null = null;

  for (const child of Children.toArray(children)) {
    if (!isValidElement(child)) {
      continue;
    }

    const element = child as DropdownMenuDescriptorElement;

    if (element.type === DropdownMenuTrigger) {
      triggerElement = element.props.children as DropdownMenuTriggerElement;
      continue;
    }

    if (element.type === DropdownMenuContent) {
      contentElement = element as ReactElement<FloatingMenuModalMenuProps>;
      continue;
    }
  }

  if (triggerElement == null || contentElement == null) {
    return null;
  }

  return (
    <FloatingMenuModal menu={contentElement}>
      {triggerElement}
    </FloatingMenuModal>
  );
}

function DropdownMenuTrigger({
  children,
}: {
  children: DropdownMenuTriggerElement;
}) {
  return children;
}

const DropdownMenuCloseContext = createContext<(() => void) | null>(null);

function DropdownMenuContent({
  children,
  className,
  onRequestClose,
}: {
  children?: ViewProps[`children`];
  className?: string;
} & FloatingMenuModalMenuProps) {
  return (
    <DropdownMenuCloseContext.Provider value={onRequestClose ?? null}>
      <View
        className={
          className == null
            ? `min-w-[190px] gap-1 rounded-xl bg-bg-high p-3`
            : `
              min-w-[190px] gap-1 rounded-xl bg-bg-high p-3

              ${className}
            `
        }
      >
        {children}
      </View>
    </DropdownMenuCloseContext.Provider>
  );
}

function DropdownMenuLabel({
  children,
  className,
}: {
  children?: TextProps[`children`];
  className?: string;
}) {
  return (
    <Text
      className={
        className == null
          ? `font-sans text-[11px] uppercase text-fg-dim`
          : `
            font-sans text-[11px] uppercase text-fg-dim

            ${className}
          `
      }
    >
      {children}
    </Text>
  );
}

function DropdownMenuSeparator({ className }: { className?: string }) {
  return (
    <View
      className={`
        my-1 h-px bg-fg-bg10

        ${className ?? ``}
      `}
    />
  );
}

interface DropdownMenuRadioGroupContextType {
  value: string;
  onValueChange: (value: string) => void;
}

const DropdownMenuRadioGroupContext =
  createContext<DropdownMenuRadioGroupContextType | null>(null);

function DropdownMenuRadioGroup({
  value,
  onValueChange,
  children,
}: {
  value: string;
  onValueChange: (value: string) => void;
  children?: ViewProps[`children`];
}) {
  return (
    <DropdownMenuRadioGroupContext.Provider value={{ value, onValueChange }}>
      {children}
    </DropdownMenuRadioGroupContext.Provider>
  );
}

function DropdownMenuRadioItem({
  value,
  children,
  className,
}: {
  value: string;
  children?: ViewProps[`children`];
  className?: string;
}) {
  const radioGroup = use(DropdownMenuRadioGroupContext);
  const onRequestClose = use(DropdownMenuCloseContext);

  if (radioGroup == null) {
    throw new Error(
      `DropdownMenu.RadioItem must be used within DropdownMenu.RadioGroup`,
    );
  }

  return (
    <RectButton
      variant="bare2"
      className={
        className == null
          ? `justify-start`
          : `
            justify-start

            ${className}
          `
      }
      iconEnd={radioGroup.value === value ? `check` : undefined}
      iconSize={16}
      onPress={() => {
        radioGroup.onValueChange(value);
        onRequestClose?.();
      }}
    >
      {children}
    </RectButton>
  );
}

function DropdownMenuItem({
  children,
  className,
  onSelect,
  href,
  iconStart,
  iconEnd,
  iconSize,
}: {
  children?: ViewProps[`children`];
  className?: string;
  onSelect?: () => void;
  href?: RectButtonProps[`href`];
  iconStart?: IconName;
  iconEnd?: IconName;
  iconSize?: RectButtonProps[`iconSize`];
}) {
  const onRequestClose = use(DropdownMenuCloseContext);

  return (
    <RectButton
      href={href}
      variant="bare2"
      className={
        className == null
          ? `justify-start`
          : `
            justify-start

            ${className}
          `
      }
      iconStart={iconStart}
      iconEnd={iconEnd}
      iconSize={iconSize}
      onPress={() => {
        onSelect?.();
        onRequestClose?.();
      }}
    >
      {children}
    </RectButton>
  );
}

export const DropdownMenu = Object.assign(DropdownMenuRoot, {
  Trigger: DropdownMenuTrigger,
  Content: DropdownMenuContent,
  Label: DropdownMenuLabel,
  Separator: DropdownMenuSeparator,
  RadioGroup: DropdownMenuRadioGroup,
  RadioItem: DropdownMenuRadioItem,
  Item: DropdownMenuItem,
});
