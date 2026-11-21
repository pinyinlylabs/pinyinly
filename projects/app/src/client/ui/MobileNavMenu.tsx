import { breakpoints } from "@/client/ui/breakpoints";
import { useVisualViewportSize } from "@/client/ui/hooks/useVisualViewportSize";
import { Icon } from "@/client/ui/Icon";
import { BuildTimestampStamp } from "@/client/ui/BuildTimestampStamp";
import { UserSettingToggleGuard } from "@/client/ui/UserSettingToggleGuard";
import { navItems } from "@/client/ui/navItems";
import type { Href } from "expo-router";
import { Link, usePathname } from "expo-router";
import type { ReactNode } from "react";
import { useLayoutEffect, useRef } from "react";
import { Platform, Pressable, ScrollView } from "react-native";
import { Text } from "@/client/ui/Text";
import { View } from "@/client/ui/View";
import { HeaderProvider } from "./HeaderProvider";
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
    <HeaderProvider>
      <HeaderProvider.DefaultTitle title="Menu" />
      <PageSheetModal onDismiss={onClose} suspenseFallback={null}>
        {({ dismiss }) => <NavMenuContent dismiss={dismiss} />}
      </PageSheetModal>
    </HeaderProvider>
  );
}

function NavMenuContent({ dismiss }: { dismiss: () => void }) {
  return (
    <View className="size-full bg-bg">
      <View className="flex-row px-4 py-3">
        <View className="w-8 shrink" />
        <View className="flex-1 items-center">
          <HeaderProvider.TitleText className={`pyly-body-title`} />
        </View>
        <View className="w-8 shrink">
          <Pressable onPress={dismiss}>
            <Icon icon="close" size={32} />
          </Pressable>
        </View>
      </View>
      <ScrollView
        className="flex-1"
        contentContainerClassName="items-stretch gap-8 px-4 pt-4 pb-6"
        keyboardShouldPersistTaps="handled"
      >
        <View className="w-full gap-3">
          {navItems
            .filter((section) => section.primary === true)
            .map((section, sectionIndex) => (
              <View
                key={sectionIndex}
                className="w-full overflow-hidden rounded-xl bg-bg-high"
              >
                {section.items.map((item, itemIndex) => (
                  <UserSettingToggleGuard key={itemIndex} setting={item.guard}>
                    <MobileNavItem
                      name={item.name}
                      href={item.href}
                      lozenge={item.lozenge}
                      onNavigate={dismiss}
                    />
                  </UserSettingToggleGuard>
                ))}
              </View>
            ))}
        </View>

        <View className="items-start px-4">
          {navItems
            .filter((section) => section.primary !== true)
            .map((section, sectionIndex) => (
              <View
                key={sectionIndex}
                className={sectionIndex === 0 ? `mt-3` : undefined}
              >
                {section.items.map((item, itemIndex) => (
                  <UserSettingToggleGuard key={itemIndex} setting={item.guard}>
                    <MobileNavSubtleItem
                      name={item.name}
                      href={item.href}
                      onNavigate={dismiss}
                    />
                  </UserSettingToggleGuard>
                ))}
              </View>
            ))}
        </View>
        {Platform.OS === `web` ? <BuildTimestampStamp /> : null}
      </ScrollView>
    </View>
  );
}

function MobileNavItem({
  name,
  href,
  lozenge,
  onNavigate,
}: {
  name: string;
  href: Href;
  lozenge: ReactNode;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const isActive = isNavItemActive(pathname, href as string);

  return (
    <Link href={href} asChild>
      <Pressable
        onPress={onNavigate}
        className={`
          w-full flex-row py-2.5 pr-3 pl-4

          hover:bg-fg/10
        `}
      >
        <View className="relative flex-row items-center gap-2">
          <Text className="pyly-button-outline">{name}</Text>
          {lozenge}
        </View>
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
          className={`font-sans text-sm/[32px] font-bold text-muted-fg uppercase`}
        >
          {name}
        </Text>
      </Pressable>
    </Link>
  );
}
