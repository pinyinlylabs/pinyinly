import type { Href } from "expo-router";
import type { ReactElement, ReactNode } from "react";
import { Children } from "react";
import { Text, View } from "react-native";
import type { FloatingMenuModalMenuProps } from "./FloatingMenuModal";
import { FloatingMenuModal } from "./FloatingMenuModal";
import { RectButton } from "./RectButton";

export interface BreadcrumbsItemProps {
  children?: ReactNode;
  href?: Href;
  menu?: ReactElement<FloatingMenuModalMenuProps>;
}

function BreadcrumbsItem({ children, href, menu }: BreadcrumbsItemProps) {
  const trigger = (
    <RectButton
      href={menu == null ? href : undefined}
      variant="bare2"
      iconSize={16}
      iconEnd={menu == null ? undefined : `chevron-up-down`}
    >
      {children}
    </RectButton>
  );

  if (menu == null) {
    return trigger;
  }

  return <FloatingMenuModal menu={menu}>{trigger}</FloatingMenuModal>;
}

export interface BreadcrumbsProps {
  children?: ReactNode;
}

function Breadcrumbs({ children }: BreadcrumbsProps) {
  const items = Children.toArray(children);
  return (
    <View className="flex-row items-center gap-1">
      {items.flatMap((item, index) =>
        index === 0
          ? [item]
          : [
              <Text key={`sep-${index}`} className="text-fg-dim">
                /
              </Text>,
              item,
            ],
      )}
    </View>
  );
}

Breadcrumbs.Item = BreadcrumbsItem;

export { Breadcrumbs };
