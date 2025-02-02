import { useAuth } from "@/client/ui/auth";
import { Image } from "expo-image";
import { Link } from "expo-router";
import {
  TabList,
  Tabs,
  TabSlot,
  TabTrigger,
  TabTriggerSlotProps,
} from "expo-router/ui";
import { StatusBar } from "expo-status-bar";
import { ElementRef, forwardRef, ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { tv } from "tailwind-variants";

export default function SideNavLayout() {
  const isAuthenticated = useAuth().data?.clientSession.serverSessionId != null;

  return (
    <Tabs className="flex-1 flex-col-reverse items-stretch self-stretch lg:flex-row">
      <TabList className="flex-grow-0 items-center gap-4 justify-self-stretch border-t-2 border-primary-4 pt-2 pb-safe-or-2 px-safe-or-4 lg:flex-col lg:items-start lg:border-t-0 lg:px-4 lg:pt-6">
        <Link
          href="/dashboard"
          className="hidden px-2 py-1 text-2xl font-bold tracking-wide text-primary-10 lg:flex"
        >
          <Image
            source={require(`@/assets/logo/logotype.svg`)}
            className="h-[40px] w-[140px] flex-shrink text-primary-12"
            tintColor="currentColor"
            contentFit="fill"
          />
        </Link>

        <TabTrigger name="Learn" href="/dashboard" asChild>
          <TabButton className={buttonClass()}>
            {({ isFocused }) => (
              <>
                <Image
                  source={
                    isFocused
                      ? require(`@/assets/icons/home-filled.svg`)
                      : require(`@/assets/icons/home.svg`)
                  }
                  className={iconClass({ isFocused })}
                  tintColor="currentColor"
                  contentFit="fill"
                />
                <Text className={buttonTextClass({ isFocused })}>Learn</Text>
              </>
            )}
          </TabButton>
        </TabTrigger>

        {/* Required to allow these routes to work. */}
        <TabTrigger name="Radical" href="/radical/" asChild></TabTrigger>
        <TabTrigger name="Word" href="/word/[id]" asChild></TabTrigger>

        <TabTrigger name="Connections" href="/connections" asChild>
          <TabButton className={buttonClass()}>
            {({ isFocused }) => (
              <>
                <Image
                  source={
                    isFocused
                      ? require(`@/assets/icons/bookmark-filled.svg`)
                      : require(`@/assets/icons/bookmark.svg`)
                  }
                  className={iconClass({ isFocused })}
                  tintColor="currentColor"
                  contentFit="fill"
                />
                <Text className={buttonTextClass({ isFocused })}>
                  Connections
                </Text>
              </>
            )}
          </TabButton>
        </TabTrigger>

        <TabTrigger name="Radicals" href="/explore/radicals" asChild>
          <TabButton>Radicals</TabButton>
        </TabTrigger>

        <TabTrigger name="Words" href="/explore/words" asChild>
          <TabButton>Words</TabButton>
        </TabTrigger>

        <TabTrigger name="Mnemonics" href="/explore/mnemonics" asChild>
          <TabButton>Mnemonics</TabButton>
        </TabTrigger>

        <TabTrigger name="History" href="/history" asChild>
          <TabButton className={buttonClass()}>
            {({ isFocused }) => (
              <>
                <Image
                  source={
                    isFocused
                      ? require(`@/assets/icons/badge-filled.svg`)
                      : require(`@/assets/icons/badge.svg`)
                  }
                  className={iconClass({ isFocused })}
                  tintColor="currentColor"
                  contentFit="fill"
                />
                <Text className={buttonTextClass({ isFocused })}>History</Text>
              </>
            )}
          </TabButton>
        </TabTrigger>

        <Link href="/dev/ui">
          <Text className={buttonClass()}>UI</Text>
        </Link>

        <View className="flex-1" />

        <Link
          href="/login"
          className="items-center rounded-md px-2 py-1 text-xl font-bold tracking-wide text-text hover:bg-primary-4 lg:self-stretch"
        >
          {isAuthenticated ? (
            <View className="size-10 rounded-full bg-[green]"></View>
          ) : (
            <View className="size-10 rounded-full border-2 border-solid border-[white] bg-[grey]"></View>
          )}
        </Link>
      </TabList>

      <TabSlot />

      <StatusBar style="auto" />
    </Tabs>
  );
}

type TabButtonProps = Omit<TabTriggerSlotProps, `children`> & {
  children: ReactNode | ((options: { isFocused: boolean }) => ReactNode);
};

const TabButton = forwardRef<ElementRef<typeof Pressable>, TabButtonProps>(
  (
    {
      children,
      isFocused = false,
      style, // pull out of `...props` and don't pass to <Pressable>
      ...props
    },
    forwardedRef,
  ) => (
    <Pressable {...props} ref={forwardedRef}>
      {typeof children === `function` ? (
        children({ isFocused })
      ) : (
        <Text
          className={buttonClass({
            className: buttonTextClass({ isFocused }),
          })}
        >
          {children}
        </Text>
      )}
    </Pressable>
  ),
);
TabButton.displayName = `TabButton`;

const iconClass = tv({
  base: `h-[24px] w-[24px] flex-shrink`,
  variants: {
    isFocused: {
      true: `text-primary-12`,
      false: `text-primary-10`,
    },
  },
});

const buttonClass = tv({
  base: `rounded-md px-2 py-1 flex-row gap-2`,
});

const buttonTextClass = tv({
  base: `text-xl font-bold text-text hidden lg:flex transition-colors`,
  variants: {
    isFocused: {
      true: `text-primary-12`,
      false: `text-primary-10`,
    },
  },
});
