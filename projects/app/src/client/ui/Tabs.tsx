import { hapticImpactIfMobile } from "@/client/ui/hooks/hapticImpactIfMobile";
import type { PropsOf } from "@pinyinly/lib/types";
import type { ReactNode } from "react";
import { createContext, use, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { tv } from "tailwind-variants";

interface TabsContextValue {
  value: string;
  onChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = use(TabsContext);
  if (context == null) {
    throw new Error(`Tabs compound components must be used within a Tabs`);
  }
  return context;
}

export interface TabsListProps {
  className?: string;
  children?: ReactNode;
}

function TabsList({ className, children }: TabsListProps) {
  return <View className={tabsListClass({ className })}>{children}</View>;
}

export interface TabsTriggerProps {
  value: string;
  className?: string;
  children?: ReactNode;
}

export type TabsTriggerFullProps = TabsTriggerProps &
  Omit<PropsOf<typeof Pressable>, `children`>;

function TabsTrigger({
  value,
  className,
  children,
  ...pressableProps
}: TabsTriggerFullProps) {
  const { value: activeValue, onChange } = useTabsContext();
  const isActive = value === activeValue;
  const disabled = pressableProps.disabled === true;

  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      {...pressableProps}
      onPress={(e) => {
        onChange(value);
        pressableProps.onPress?.(e);
      }}
      onHoverIn={(e) => {
        setHovered(true);
        pressableProps.onHoverIn?.(e);
      }}
      onHoverOut={(e) => {
        setHovered(false);
        pressableProps.onHoverOut?.(e);
      }}
      onPressIn={(e) => {
        setPressed(true);
        hapticImpactIfMobile();
        pressableProps.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        pressableProps.onPressOut?.(e);
      }}
      className={className}
    >
      <View
        className={triggerInnerClass({
          isActive,
          disabled,
          hoveredOrPressed: pressed || hovered,
        })}
      >
        <Text className={triggerTextClass({ isActive })}>{children}</Text>
      </View>
    </Pressable>
  );
}

export interface TabsContentProps {
  value: string;
  className?: string;
  children?: ReactNode;
}

function TabsContent({ value, className, children }: TabsContentProps) {
  const { value: activeValue } = useTabsContext();

  if (value !== activeValue) {
    return null;
  }

  return <View className={className}>{children}</View>;
}

export interface TabsProps {
  defaultValue: string;
  className?: string;
  children?: ReactNode;
}

export const Tabs = Object.assign(
  function Tabs({ defaultValue, className, children }: TabsProps) {
    const [value, setValue] = useState(defaultValue);

    return (
      <TabsContext.Provider value={{ value, onChange: setValue }}>
        <View className={className}>{children}</View>
      </TabsContext.Provider>
    );
  },
  {
    List: TabsList,
    Trigger: TabsTrigger,
    Content: TabsContent,
  },
);

const tabsListClass = tv({
  base: `rounded-lg bg-fg/5 p-1`,
});

const triggerInnerClass = tv({
  base: `
    box-border select-none items-center justify-center overflow-hidden rounded-md px-4 py-2

    web:transition-colors
  `,
  variants: {
    isActive: {
      true: `bg-bg`,
      false: `bg-transparent`,
    },
    hoveredOrPressed: {
      true: ``,
    },
    disabled: {
      true: `cursor-default select-none opacity-40`,
    },
  },
  compoundVariants: [
    // Active hover (slightly darker)
    {
      isActive: true,
      hoveredOrPressed: true,
      disabled: false,
      class: `bg-bg/90`,
    },
    // Inactive hover (slight background)
    {
      isActive: false,
      hoveredOrPressed: true,
      disabled: false,
      class: `bg-fg/5`,
    },
  ],
});

const triggerTextClass = tv({
  base: `font-sans text-sm/normal font-bold uppercase`,
  variants: {
    isActive: {
      true: `text-fg`,
      false: `text-fg-dim`,
    },
  },
});
