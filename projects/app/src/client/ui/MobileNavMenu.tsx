import { breakpoints } from "@/client/ui/breakpoints";
import { useVisualViewportSize } from "@/client/ui/hooks/useVisualViewportSize";
import { Icon } from "@/client/ui/Icon";
import { navItems } from "@/client/ui/navItems";
import { QuickSearchButton } from "@/client/ui/QuickSearchButton";
import type { Href } from "expo-router";
import { Link, usePathname } from "expo-router";
import type { ReactNode } from "react";
import { useLayoutEffect, useRef } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { HeaderTitleProvider } from "./HeaderTitleProvider";
import { PageSheetModal } from "./PageSheetModal";

interface MobileNavMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Check if a pathname should highlight a navigation item.
 * Returns true if the pathname matches the href or is a child route.
 */
function isNavItemActive(pathname: string, href: string): boolean {
  if (pathname === href) {
    return true;
  }
  if (pathname.startsWith(href + `/`)) {
    return true;
  }
  return false;
}

export function MobileNavMenu({ isOpen, onClose }: MobileNavMenuProps) {
  const pathName = usePathname();
  const previousPathNameRef = useRef(pathName);

  const visualViewport = useVisualViewportSize();
  const isSm = visualViewport != null && visualViewport.width >= breakpoints.sm;

  useLayoutEffect(() => {
    if (isOpen && isSm) {
      onClose();
    }
  }, [isOpen, isSm, onClose]);

  useLayoutEffect(() => {
    if (isOpen && previousPathNameRef.current !== pathName) {
      onClose();
    }
    previousPathNameRef.current = pathName;
  }, [isOpen, onClose, pathName]);

  if (!isOpen) {
    return null;
  }

  return (
    <HeaderTitleProvider>
      <PageSheetModal onDismiss={onClose} suspenseFallback={null}>
        {({ dismiss }) => (
          <View className="size-full bg-bg">
            <View className="flex-row px-4 py-3">
              <View className="w-[32px] shrink" />
              <View className="flex-1 items-center">
                <HeaderTitleProvider.TitleText className={`pyly-body-title`} />
              </View>
              <View className="w-[32px] shrink">
                <Pressable onPress={dismiss}>
                  <Icon icon="close" size={32} />
                </Pressable>
              </View>
            </View>
            <ScrollView
              className="flex-1"
              contentContainerClassName="gap-8 px-4 pb-6"
              keyboardShouldPersistTaps="handled"
            >
              <View>
                <Text className="pyly-body-title">Menu</Text>
                <HeaderTitleProvider.ScrollTrigger title="Menu" />
              </View>
              <QuickSearchButton className="place-self-stretch" />
              {navItems
                .filter((section) => section.primary === true)
                .map((section, sectionIndex) => (
                  <MobileNavGroup key={sectionIndex} title={section.title}>
                    {section.items.map((item, itemIndex) => (
                      <MobileNavItem
                        key={itemIndex}
                        name={item.name}
                        href={item.href}
                        onNavigate={dismiss}
                      />
                    ))}
                  </MobileNavGroup>
                ))}

              <View className="items-start px-4">
                {navItems
                  .filter((section) => section.primary !== true)
                  .map((section, sectionIndex) => (
                    <View key={sectionIndex}>
                      {sectionIndex === 0 ? null : (
                        <View className="invisible h-[40px]" />
                      )}
                      {section.items.map((item, itemIndex) => (
                        <MobileNavSubtleItem
                          key={itemIndex}
                          name={item.name}
                          href={item.href}
                          onNavigate={dismiss}
                        />
                      ))}
                    </View>
                  ))}
              </View>
            </ScrollView>
          </View>
        )}
      </PageSheetModal>
    </HeaderTitleProvider>
  );
}

function MobileNavGroup({
  children,
  title,
}: {
  children: ReactNode;
  title?: string;
}) {
  return (
    <View className="gap-2.5">
      {title == null ? null : (
        <View className="px-4">
          <Text className="pyly-body-dt">{title}</Text>
        </View>
      )}
      <View className="gap-0.5 overflow-hidden rounded-xl">{children}</View>
    </View>
  );
}

function MobileNavItem({
  name,
  href,
  onNavigate,
}: {
  name: string;
  href: Href;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const isActive = isNavItemActive(pathname, href as string);

  return (
    <Link href={href} asChild>
      <Pressable
        onPress={onNavigate}
        className={`
          flex-row bg-bg-high py-2.5 pl-4 pr-3

          hover:bg-fg/10
        `}
      >
        <Text className="pyly-button-outline">{name}</Text>
        <View className="flex-1 items-end">
          {isActive ? <Icon icon="check" size={24} /> : null}
        </View>
      </Pressable>
    </Link>
  );
}

function MobileNavSubtleItem({
  name,
  href,
  onNavigate,
}: {
  name: string;
  href: Href;
  onNavigate: () => void;
}) {
  return (
    <Link href={href} asChild>
      <Pressable onPress={onNavigate}>
        <Text
          className={`
            font-sans text-sm/[32px] font-bold uppercase text-fg-dim

            hover:text-fg
          `}
        >
          {name}
        </Text>
      </Pressable>
    </Link>
  );
}
