import { useVisualViewportSize } from "@/client/hooks/useVisualViewportSize";
import { reactInvariant } from "@/client/react";
import { IconImage } from "@/client/ui/IconImage";
import { RectButton } from "@/client/ui/RectButton";
import { invariant } from "@pinyinly/lib/invariant";
import type { Href } from "expo-router";
import { Link, usePathname } from "expo-router";
import type { TabTriggerProps, TabTriggerSlotProps } from "expo-router/ui";
import { TabList, Tabs, TabSlot, TabTrigger } from "expo-router/ui";
import { StatusBar } from "expo-status-bar";
import type { FunctionComponent, ReactNode } from "react";
import { Fragment, useLayoutEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { tv } from "tailwind-variants";

export default function MenuLayout() {
  return (
    <Tabs
      className={`
        flex-1 items-stretch self-stretch

        md:flex-row
      `}
    >
      {/* ROUTE DECLARATIONS */}
      <TabList className="hidden">
        {navItems.map((section, sectionIndex) =>
          section.items.map((item, itemIndex) => (
            <TabTrigger
              key={`${sectionIndex}-${itemIndex}`}
              name={item.name}
              href={item.href}
            />
          )),
        )}
      </TabList>

      {/* Mobile header nav */}
      <MobileTopMenu
        className="sm:hidden"
        leftButton={
          <Link href="/learn">
            <IconImage source={require(`@/assets/icons/close.svg`)} size={32} />
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
                <RectButton
                  variant="bare"
                  className={`
                    flex-row gap-2 opacity-75

                    hover:opacity-100
                  `}
                >
                  <IconImage
                    source={require(`@/assets/icons/arrow-return-left.svg`)}
                    size={24}
                  />
                  <Text className="pyly-button-bare">Back to app</Text>
                </RectButton>
              </Link>
            </View>

            <View className="w-[200px] items-stretch rounded-xl bg-bg-loud py-3">
              {navItems
                .filter((section) => section.primary === true)
                .map((section, sectionIndex) => (
                  <Fragment key={sectionIndex}>
                    {/* GAP */}
                    {sectionIndex === 0 ? null : (
                      <View className={`invisible h-[40px]`} />
                    )}
                    {section.title == null ? null : (
                      <DesktopNavGroupTitle name={section.title} />
                    )}
                    {section.items.map((item, itemIndex) => (
                      <DesktopNavGroupItem key={itemIndex} name={item.name} />
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
                      <View className={`invisible h-[40px]`} />
                    )}

                    {section.items.map((item, itemIndex) => (
                      <DesktopNavSubtleItem key={itemIndex} name={item.name} />
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
          <TabSlot />
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

      {/* is this needed? */}
      <StatusBar style="auto" />
    </Tabs>
  );
}

function DesktopNavGroupTitle({ name }: { name: string }) {
  return (
    <View className="h-[24px] items-end justify-center px-[24px]">
      <Text className="pyly-body-dt">{name}</Text>
    </View>
  );
}

interface TabTriggerChildProps
  extends Pick<TabTriggerSlotProps, `isFocused` | `href`> {
  name: string;
}

const DesktopNavSubtleItem = customTabTrigger(
  ({ name, isFocused, ...rest }) => {
    return (
      <Pressable {...rest} className="h-[32px] justify-center">
        <Text
          className={`
            font-sans text-sm/normal font-light uppercase text-caption/90

            hover:text-caption
          `}
        >
          {name}
        </Text>
      </Pressable>
    );
  },
);

const DesktopNavGroupItem = customTabTrigger(({ isFocused, name, ...rest }) => {
  return (
    <Pressable {...rest}>
      <View className={buttonContainerClass({ isFocused })}>
        <Text className="font-sans text-sm/normal font-normal uppercase text-fg">
          {name}
        </Text>
      </View>
    </Pressable>
  );
});

function MobileNavTrigger() {
  const [isOpen, setIsOpen] = useState(false);
  const pathName = usePathname();

  // Close the menu when the screen size is large enough.
  const visualViewport = useVisualViewportSize();
  const isSm = visualViewport != null && visualViewport.width >= 640;
  useLayoutEffect(() => {
    if (isSm) {
      setIsOpen(false);
    }
  }, [isSm]);

  useLayoutEffect(() => {
    setIsOpen(false);
  }, [pathName]);

  return (
    <>
      <Pressable
        onPress={() => {
          setIsOpen((prev) => !prev);
        }}
      >
        <IconImage source={require(`@/assets/icons/menu.svg`)} size={32} />
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
                  <IconImage
                    source={require(`@/assets/icons/close.svg`)}
                    size={32}
                  />
                </Pressable>
              }
            />
            <View className="size-full gap-8 px-4 pb-6">
              {navItems
                .filter((section) => section.primary === true)
                .map((section, sectionIndex) => (
                  <MobileNavGroup key={sectionIndex} title={section.title}>
                    {section.items.map((item, itemIndex) => (
                      <MobileNavGroupItem key={itemIndex} name={item.name} />
                    ))}
                  </MobileNavGroup>
                ))}

              {/* GAP */}

              <View className="items-start px-4">
                {navItems
                  .filter((section) => section.primary !== true)
                  .map((section, sectionIndex) => (
                    <Fragment key={sectionIndex}>
                      {/* GAP */}
                      {sectionIndex === 0 ? null : (
                        <View className={`invisible h-[40px]`} />
                      )}

                      {section.items.map((item, itemIndex) => (
                        <MobileNavSubtleItem key={itemIndex} name={item.name} />
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
      <View className={`gap-0.5 overflow-hidden rounded-xl`}>{children}</View>
    </View>
  );
}

const MobileNavGroupItem = customTabTrigger(
  ({ name, isFocused = false, ...rest }) => {
    return (
      <Pressable
        {...rest}
        className={`
          flex-row bg-bg-loud py-2.5 pl-4 pr-3

          hover:bg-fg/10
        `}
      >
        <Text className="pyly-button-outline">{name}</Text>
        <View className="flex-1 items-end">
          {isFocused ? (
            <IconImage source={require(`@/assets/icons/check.svg`)} size={24} />
          ) : null}
        </View>
      </Pressable>
    );
  },
);

const MobileNavSubtleItem = customTabTrigger(({ name, isFocused, ...rest }) => {
  return (
    <Pressable {...rest} className="h-[32px] justify-center">
      <Text
        className={`
          font-sans text-sm/normal font-light uppercase text-caption/90

          hover:text-caption
        `}
      >
        {name}
      </Text>
    </Pressable>
  );
});

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
      {/* Left icons */}
      <View className="w-[32px] shrink">{leftButton ?? null}</View>

      {/* Middle title */}
      <View className="flex-1 items-center">
        <Text className="pyly-body-heading">{title}</Text>
      </View>

      {/* Right icons */}
      <View className="w-[32px] shrink">{rightButton ?? null}</View>
    </View>
  );
}

const buttonContainerClass = tv({
  base: `
    h-[32px] flex-1 items-end justify-center px-[24px]

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
      { name: `Overview`, href: `/overview` },
      { name: `Skills`, href: `/skills` },
      { name: `History`, href: `/history` },
      // { name: `Tutoring`, href: `/tutoring` },
      // { name: `Wiki`, href: `/wiki` },
    ] satisfies NavItem[],
  },
  {
    title: `Settings`,
    primary: true,
    items: [
      { name: `Appearance`, href: `/settings/appearance` },
      // { name: `Profile`, href: `/settings/profile` },
      // { name: `Courses`, href: `/settings/courses` },
      // { name: `Notifications`, href: `/settings/notifications` },
      // { name: `Billing`, href: `/settings/billing` },
      // { name: `Support`, href: `/settings/support` },
    ] satisfies NavItem[],
  },
  {
    // { name: "Logout", href: `/logout` },
    // { name: "Terms", href: `/terms` },
    // { name: "Privacy Policy", href: `/privacy` },
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

/**
 * Wrap a component in a `<TabTrigger>` and pass down the props.
 * @param Component
 * @returns
 */
function customTabTrigger(Component: FunctionComponent<TabTriggerChildProps>) {
  Component = __DEV__
    ? // In dev mode add some extra validation checks to make sure that TabTrigger
      // passes through the correct props to the child Pressable.
      reactInvariant(Component, (props) => {
        invariant(
          `href` in props,
          `customTabTrigger component missing required 'href' prop`,
        );
      })
    : Component;

  return Object.assign(
    (props: Pick<TabTriggerProps, `name` | `style`>) => (
      <TabTrigger {...props} asChild>
        <Component name={props.name} />
      </TabTrigger>
    ),
    { displayName: Component.displayName },
  );
}
