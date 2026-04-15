import { HeaderTitleContext } from "@/client/ui/contexts";
import { Icon } from "@/client/ui/Icon";
import { HeaderTitleProvider } from "@/client/ui/HeaderTitleProvider";
import { MobileNavMenu } from "@/client/ui/MobileNavMenu";
import { navItems } from "@/client/ui/navItems";
import { QuickSearchButton } from "@/client/ui/QuickSearchButton";
import { RectButton } from "@/client/ui/RectButton";
import type { Href } from "expo-router";
import { Link, Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import type { ReactNode } from "react";
import { Fragment, use, useState } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { Pressable, ScrollView, Text, View } from "react-native";
import { tv } from "tailwind-variants";
import Reanimated, { FadeIn, FadeOut } from "react-native-reanimated";

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

export default function MenuLayout() {
  return (
    <HeaderTitleProvider>
      <MenuLayoutContent />
    </HeaderTitleProvider>
  );
}

function MenuLayoutContent() {
  const [
    isMobileTopMenuBackgroundVisible,
    setIsMobileTopMenuBackgroundVisible,
  ] = useState(false);

  function handleMenuScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const shouldShowBackground = event.nativeEvent.contentOffset.y > 8;
    setIsMobileTopMenuBackgroundVisible((prev) => {
      if (prev === shouldShowBackground) {
        return prev;
      }
      return shouldShowBackground;
    });
  }

  return (
    <View
      className={`
        flex-1 items-stretch self-stretch

        md:flex-row
      `}
    >
      {/* Mobile header nav */}
      <ScrollView
        onScroll={handleMenuScroll}
        scrollEventThrottle={16}
        contentContainerClassName={`
          pt-safe-offset-[56px]

          sm:py-safe-offset-5

          px-safe-or-4 flex-row
        `}
      >
        {/* Left side */}
        <View
          className={`
            hidden

            sm:flex sm:min-w-[240px] sm:items-end sm:pr-[32px]

            menu-lg:flex-1
          `}
        >
          <View className="sticky items-end top-safe-offset-5">
            <View className="mb-5 h-[32px] justify-center pr-4">
              <Link href="/learn" asChild>
                <RectButton variant="bare" iconStart="arrow-return-left">
                  Back to practice
                </RectButton>
              </Link>
            </View>

            <QuickSearchButton className="mb-4 place-self-stretch" />

            <View className="w-[200px] items-stretch rounded-xl bg-bg-high py-3">
              {navItems
                .filter((section) => section.primary === true)
                .map((section, sectionIndex) => (
                  <Fragment key={sectionIndex}>
                    {/* GAP */}
                    {sectionIndex === 0 ? null : (
                      <View className="invisible h-[40px]" />
                    )}
                    {section.title == null ? null : (
                      <DesktopNavGroupTitle name={section.title} />
                    )}
                    {section.items.map((item, itemIndex) => (
                      <DesktopNavItem
                        key={itemIndex}
                        name={item.name}
                        href={item.href}
                      />
                    ))}
                  </Fragment>
                ))}
            </View>

            {/* GAP */}
            <View className="invisible min-h-10 flex-1" />

            <View className="items-end px-5">
              {navItems
                .filter((section) => section.primary !== true)
                .map((section, sectionIndex) => (
                  <Fragment key={sectionIndex}>
                    {/* GAP */}
                    {sectionIndex === 0 ? null : (
                      <View className="invisible h-[40px]" />
                    )}
                    {section.items.map((item, itemIndex) => (
                      <DesktopNavSubtleItem
                        key={itemIndex}
                        name={item.name}
                        href={item.href}
                      />
                    ))}
                  </Fragment>
                ))}
            </View>
          </View>
        </View>

        {/* Middle */}
        <View
          className={`
            flex-1

            menu-lg:w-[600px] menu-lg:max-w-[600px] menu-lg:flex-none
          `}
        >
          <Stack screenOptions={{ headerShown: false }} />
        </View>

        {/* Right side */}
        <View
          className={`
            hidden

            sm:flex

            menu-lg:flex-1
          `}
        ></View>
      </ScrollView>

      {/* Mobile header nav */}
      <MobileFloatingTitle
        className="sm:hidden"
        isBackgroundVisible={isMobileTopMenuBackgroundVisible}
        rightButton={<MobileNavMenuTrigger />}
      />

      <DesktopFloatingTitle />

      <StatusBar style="auto" />
    </View>
  );
}

function DesktopFloatingTitle() {
  const title = use(HeaderTitleContext)?.title;

  if (title == null) {
    return null;
  }

  return (
    <Reanimated.View
      entering={FadeIn.duration(100)}
      exiting={FadeOut.duration(100)}
      className={`
        hidden

        sm:flex
      `}
      style={{
        position: `fixed`,
        left: 0,
        right: 0,
        top: 0,
        zIndex: 20,
      }}
    >
      <View className="pointer-events-none size-full flex-row">
        <View
          className={`
            hidden

            sm:flex sm:min-w-[240px] sm:pr-[32px]

            menu-lg:flex-1
          `}
        ></View>

        <View
          className={`
            relative flex-1

            menu-lg:w-[600px] menu-lg:max-w-[600px] menu-lg:flex-none
          `}
        >
          <View className="relative h-[56px] items-center justify-center">
            <View
              className={`
                absolute -inset-x-2 -bottom-10 top-0 bg-bg/90 backdrop-blur-sm

                [-webkit-mask-image:linear-gradient(to_top,transparent,black_50%,black)]

                [mask-image:linear-gradient(to_top,transparent,black_50%,black)]
              `}
            />

            <HeaderTitleProvider.TitleText className="pyly-body-title" />
          </View>
        </View>

        <View
          className={`
            hidden

            sm:flex

            menu-lg:flex-1
          `}
        ></View>
      </View>
    </Reanimated.View>
  );
}

function DesktopNavGroupTitle({ name }: { name: string }) {
  return (
    <View className="h-[24px] items-end justify-center px-[24px]">
      <Text className="pyly-body-dt">{name}</Text>
    </View>
  );
}

interface NavItemProps {
  name: string;
  href: Href;
}

const DesktopNavItem = ({ name, href }: NavItemProps) => {
  const pathname = usePathname();
  const isActive = isNavItemActive(pathname, href as string);

  return (
    <Link href={href} asChild>
      <Pressable className={buttonContainerClass({ isFocused: isActive })}>
        <Text className="font-sans text-sm/normal font-bold uppercase text-fg">
          {name}
        </Text>
      </Pressable>
    </Link>
  );
};

const DesktopNavSubtleItem = ({ name, href }: NavItemProps) => {
  return (
    <Link href={href} asChild>
      <Pressable>
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
};

function MobileNavMenuTrigger() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => {
          setIsOpen((prev) => !prev);
        }}
      >
        <Icon icon="menu" size={32} />
      </Pressable>
      <MobileNavMenu
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
        }}
      />
    </>
  );
}

function MobileFloatingTitle({
  leftButton,
  rightButton,
  isBackgroundVisible,
  className,
}: {
  leftButton?: ReactNode;
  rightButton?: ReactNode;
  isBackgroundVisible: boolean;
  className?: string;
}) {
  return (
    <Reanimated.View
      entering={FadeIn.duration(100)}
      exiting={FadeOut.duration(100)}
      className={`
        pointer-events-none

        ${className ?? ``}
      `}
      style={{
        position: `fixed`,
        left: 0,
        right: 0,
        top: 0,
        zIndex: 20,
      }}
    >
      <View className="pointer-events-none pt-safe-offset-2 px-safe-or-4">
        {isBackgroundVisible ? (
          <Reanimated.View
            entering={FadeIn.duration(100)}
            exiting={FadeOut.duration(100)}
            className={`
              absolute -inset-x-2 -bottom-4 top-0 bg-bg/90 backdrop-blur-sm

              [-webkit-mask-image:linear-gradient(to_top,transparent,black_50%,black)]

              [mask-image:linear-gradient(to_top,transparent,black_50%,black)]
            `}
          />
        ) : null}

        <View className="pointer-events-auto h-[56px] flex-row items-center">
          <View className="w-[32px] shrink">{leftButton ?? null}</View>
          <View className="flex-1 items-center justify-center">
            <HeaderTitleProvider.TitleText className="pyly-body-title" />
          </View>
          <View className="w-[32px] shrink">{rightButton ?? null}</View>
        </View>
      </View>
    </Reanimated.View>
  );
}

const buttonContainerClass = tv({
  base: `
    h-[32px] flex-row items-center justify-end px-[24px]

    hover:bg-fg/5
  `,
  variants: {
    isFocused: {
      true: `bg-fg/10`,
    },
  },
});
