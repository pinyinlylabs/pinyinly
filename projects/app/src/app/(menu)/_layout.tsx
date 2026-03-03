import { useVisualViewportSize } from "@/client/ui/hooks/useVisualViewportSize";
import { Icon } from "@/client/ui/Icon";
import { QuickSearchButton } from "@/client/ui/QuickSearchButton";
import { RectButton } from "@/client/ui/RectButton";
import type { Href } from "expo-router";
import { Link, Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import type { ReactNode } from "react";
import { Fragment, useLayoutEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { tv } from "tailwind-variants";

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
    <View
      className={`
        flex-1 items-stretch self-stretch

        md:flex-row
      `}
    >
      {/* Mobile header nav */}
      <MobileTopMenu
        className="sm:hidden"
        leftButton={
          <Link href="/learn">
            <Icon icon="close" size={32} />
          </Link>
        }
        rightButton={<MobileNavTrigger />}
      />

      <ScrollView contentContainerClassName="py-safe-offset-5 px-safe-or-4 flex-row">
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

      <StatusBar style="auto" />
    </View>
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

function MobileNavTrigger() {
  const [isOpen, setIsOpen] = useState(false);
  const pathName = usePathname();

  const visualViewport = useVisualViewportSize();
  const isSm = visualViewport != null && visualViewport.width >= 640;
  useLayoutEffect(() => {
    if (isSm) {
      // oxlint-disable-next-line react-hooks-js/set-state-in-effect
      setIsOpen(false);
    }
  }, [isSm]);

  useLayoutEffect(() => {
    // oxlint-disable-next-line react-hooks-js/set-state-in-effect
    setIsOpen(false);
  }, [pathName]);

  return (
    <>
      <Pressable
        onPress={() => {
          setIsOpen((prev) => !prev);
        }}
      >
        <Icon icon="menu" size={32} />
      </Pressable>
      {isOpen ? (
        <Modal
          presentationStyle="fullScreen"
          transparent={true}
          onRequestClose={() => {
            setIsOpen(false);
          }}
        >
          <View className="size-full bg-bg">
            <MobileTopMenu
              title="Menu"
              rightButton={
                <Pressable
                  onPress={() => {
                    setIsOpen(false);
                  }}
                >
                  <Icon icon="close" size={32} />
                </Pressable>
              }
            />
            <View className="size-full gap-8 px-4 pb-6">
              {navItems
                .filter((section) => section.primary === true)
                .map((section, sectionIndex) => (
                  <MobileNavGroup key={sectionIndex} title={section.title}>
                    {section.items.map((item, itemIndex) => (
                      <MobileNavItem
                        key={itemIndex}
                        name={item.name}
                        href={item.href}
                      />
                    ))}
                  </MobileNavGroup>
                ))}

              <View className="items-start px-4">
                {navItems
                  .filter((section) => section.primary !== true)
                  .map((section, sectionIndex) => (
                    <Fragment key={sectionIndex}>
                      {sectionIndex === 0 ? null : (
                        <View className="invisible h-[40px]" />
                      )}
                      {section.items.map((item, itemIndex) => (
                        <MobileNavSubtleItem
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
        </Modal>
      ) : null}
    </>
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

const MobileNavItem = ({ name, href }: NavItemProps) => {
  const pathname = usePathname();
  const isActive = isNavItemActive(pathname, href as string);

  return (
    <Link href={href} asChild>
      <Pressable
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
};

const MobileNavSubtleItem = ({ name, href }: NavItemProps) => {
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

function MobileTopMenu({
  leftButton,
  title,
  rightButton,
  className,
}: {
  leftButton?: React.ReactNode;
  title?: string;
  rightButton?: React.ReactNode;
  className?: string;
}) {
  return (
    <View
      className={`
        flex-row px-4 py-3

        ${className ?? ``}
      `}
    >
      <View className="w-[32px] shrink">{leftButton ?? null}</View>
      <View className="flex-1 items-center">
        <Text className="pyly-body-heading">{title}</Text>
      </View>
      <View className="w-[32px] shrink">{rightButton ?? null}</View>
    </View>
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

const navItems: NavGroup[] = [
  {
    title: `Learning`,
    primary: true,
    items: [
      { name: `Wiki`, href: `/wiki` as const },
      { name: `Sounds`, href: `/sounds` as const },
      { name: `Skills`, href: `/skills` },
      { name: `History`, href: `/history` },
    ] satisfies NavItem[],
  },
  {
    title: `Settings`,
    primary: true,
    items: [
      { name: `Profile`, href: `/settings/profile` },
      { name: `Accounts`, href: `/settings/accounts` },
      { name: `Appearance`, href: `/settings/appearance` },
    ] satisfies NavItem[],
  },
  {
    items: [
      { name: `Developer`, href: `/settings/developer` },
      { name: `Acknowledgements`, href: `/acknowledgements` },
    ] satisfies NavItem[],
  },
];

interface NavItem {
  name: string;
  href: Href;
}

interface NavGroup {
  title?: string;
  items: NavItem[];
  primary?: boolean;
}
