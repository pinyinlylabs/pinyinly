import { useVisualViewportSize } from "@/client/hooks/useVisualViewportSize";
import { IconImage } from "@/client/ui/IconImage";
import { RectButton } from "@/client/ui/RectButton";
import { invariant } from "@haohaohow/lib/invariant";
import { Link, usePathname } from "expo-router";
import type { TabTriggerSlotProps } from "expo-router/ui";
import { TabList, Tabs, TabSlot, TabTrigger } from "expo-router/ui";
import { StatusBar } from "expo-status-bar";
import type { ReactNode } from "react";
import { useLayoutEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { tv } from "tailwind-variants";

export default function SideNavLayout() {
  return (
    <Tabs
      className={`
        flex-1 items-stretch self-stretch

        md:flex-row
      `}
    >
      {/* ROUTE DECLARATIONS */}
      <TabList className="hidden">
        <TabTrigger name="Overview" href="/overview" />
        <TabTrigger name="Skills" href="/skills" />
        <TabTrigger name="History" href="/history" />

        <TabTrigger name="Profile" href="/settings/profile" />
        <TabTrigger name="Appearance" href="/settings/appearance" />
        <TabTrigger name="Notifications" href="/settings/notifications" />
        <TabTrigger name="Billing" href="/settings/billing" />
        <TabTrigger name="Support" href="/settings/support" />
      </TabList>

      {/* Mobile header navigation */}
      <MobileTopMenu
        className="sm:hidden"
        leftButton={
          <Link href="/learn">
            <IconImage source={require(`@/assets/icons/close.svg`)} size={32} />
          </Link>
        }
        rightButton={<MobileNavigationTrigger />}
      />

      <ScrollView contentContainerClassName="py-safe-offset-5 px-safe-or-4 flex-row">
        {/* Left side */}
        <View
          className={`
            hidden

            sm:flex sm:min-w-[240px] sm:items-end sm:pr-[32px]

            portal-lg:flex-1
          `}
        >
          <View className="sticky items-end top-safe-offset-5">
            <View className="mb-5 h-[32px] justify-center">
              <Link href="/learn" asChild>
                <RectButton variant="bare">Back to app</RectButton>
              </Link>
            </View>

            <View className="w-[200px] items-stretch rounded-xl bg-background-1 py-3">
              <TabButtonSectionTitle name="Learning" />
              <TabButton2 name="Overview" />
              <TabButton2 name="Skills" />
              <TabButton2 name="History" />
              <TabButton2 name="Tutoring" />
              <TabButton2 name="Wiki" />

              {/* GAP */}
              <View className="invisible h-[40px]" />

              <TabButtonSectionTitle name="Settings" />
              <TabButton2 name="Profile" />
              <TabButton2 name="Courses" />
              <TabButton2 name="Appearance" />
              <TabButton2 name="Notifications" />
              <TabButton2 name="Billing" />
              <TabButton2 name="Support" />
            </View>

            {/* GAP */}
            <View className="invisible min-h-10 flex-1" />

            <View className="items-end px-5">
              <FooterLink text="Logout" />
              <FooterLink text="Terms" />
              <FooterLink text="Privacy Policy" />
              <FooterLink text="Acknowledgements" />
            </View>
          </View>
        </View>

        {/* Middle */}
        <View
          className={`
            flex-1

            portal-lg:w-[600px] portal-lg:max-w-[600px] portal-lg:flex-none
          `}
        >
          <TabSlot />
        </View>

        {/* Right side */}
        <View
          className={`
            hidden

            sm:flex

            portal-lg:flex-1
          `}
        ></View>
      </ScrollView>

      {/* is this needed? */}
      <StatusBar style="auto" />
    </Tabs>
  );
}

function FooterLink({ text }: { text: string }) {
  return (
    <View className="h-[32px] justify-center">
      <Text className="font-sans text-sm/normal font-light uppercase text-caption">
        {text}
      </Text>
    </View>
  );
}

function TabButtonSectionTitle({ name }: { name: string }) {
  return (
    <View className="h-[24px] items-end justify-center px-[24px]">
      <Text className="hhh-body-dt">{name}</Text>
    </View>
  );
}

type TabTriggerSlotRouterProps = Pick<
  TabTriggerSlotProps,
  `isFocused` | `href`
>;

const TabButton2 = ({ name }: { name: string }) => (
  <TabTrigger name={name} asChild>
    {/* <TabTrigger> will .cloneElement() and pass through props like `href` */}
    <TabButton2Impl name={name} />
  </TabTrigger>
);

const TabButton2Impl = ({
  isFocused = false,
  name = ``,
  ...rest
}: {
  isFocused?: boolean;
  name?: string;
} & TabTriggerSlotRouterProps) => {
  if (__DEV__) {
    invariant(`href` in rest, `TabButton2Inner requires 'href' prop`);
  }
  return (
    <Pressable {...rest}>
      <View className={buttonContainerClass({ isFocused })}>
        <Text className="font-sans text-sm/normal font-normal uppercase text-foreground">
          {name}
        </Text>
      </View>
    </Pressable>
  );
};

function MobileNavigationTrigger() {
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
          <View className="size-full bg-background">
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
              <MobileNavigationGroup>
                <MobileNavigationGroupItem name="Overview" />
                <MobileNavigationGroupItem name="Skills" />
                <MobileNavigationGroupItem name="History" />
                <MobileNavigationGroupItem name="Tutoring" />
                <MobileNavigationGroupItem name="Wiki" />
              </MobileNavigationGroup>

              <MobileNavigationGroup title="Settings">
                <MobileNavigationGroupItem name="Profile" />
                <MobileNavigationGroupItem name="Courses" />
                <MobileNavigationGroupItem name="Appearance" />
                <MobileNavigationGroupItem name="Notifications" />
                <MobileNavigationGroupItem name="Billing" />
                <MobileNavigationGroupItem name="Support" />
              </MobileNavigationGroup>
            </View>
          </View>
        </Modal>
      ) : null}
    </>
  );
}

function MobileNavigationGroup({
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
          <Text className="hhh-body-dt">{title}</Text>
        </View>
      )}
      <View className={`gap-0.5 overflow-hidden rounded-xl`}>{children}</View>
    </View>
  );
}

function MobileNavigationGroupItem({ name }: { name: string }) {
  return (
    <TabTrigger name={name} style={{ flex: 1 }} asChild>
      <MobileNavigationGroupItemImpl name={name} />
    </TabTrigger>
  );
}

function MobileNavigationGroupItemImpl({
  name,
  isFocused = false,
  ...rest
}: { name: string } & TabTriggerSlotRouterProps) {
  return (
    <Pressable
      {...rest}
      className={`
        flex-row bg-background-1 py-2.5 pl-4 pr-3

        hover:bg-foreground/10
      `}
    >
      <Text className="hhh-button-outline">{name}</Text>
      <View className="flex-1 items-end">
        {isFocused ? (
          <IconImage source={require(`@/assets/icons/check.svg`)} size={24} />
        ) : null}
      </View>
    </Pressable>
  );
}

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
        <Text className="hhh-body-heading">{title}</Text>
      </View>

      {/* Right icons */}
      <View className="w-[32px] shrink">{rightButton ?? null}</View>
    </View>
  );
}

const buttonContainerClass = tv({
  base: `
    h-[32px] flex-1 items-end justify-center px-[24px]

    hover:bg-foreground/5
  `,
  variants: {
    isFocused: {
      true: `bg-foreground/10`,
    },
  },
});
