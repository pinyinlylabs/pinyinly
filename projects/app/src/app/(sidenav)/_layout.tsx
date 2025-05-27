import { useAuth } from "@/client/auth";
import { DevLozenge } from "@/client/ui/DevLozenge";
import { Image } from "expo-image";
import { Link } from "expo-router";
import type { TabTriggerSlotProps } from "expo-router/ui";
import { TabList, Tabs, TabSlot, TabTrigger } from "expo-router/ui";
import { StatusBar } from "expo-status-bar";
import type { ElementRef, ReactNode } from "react";
import { forwardRef } from "react";
import { Pressable, Text, View } from "react-native";
import { tv } from "tailwind-variants";

export default function SideNavLayout() {
  const isAuthenticated = useAuth().data?.clientSession.serverSessionId != null;

  return (
    <Tabs className="flex-1 flex-col-reverse items-stretch self-stretch md:flex-row">
      <TabList className="grow-0 items-center gap-4 justify-self-stretch border-t-2 border-primary-4 pt-2 pb-safe-or-2 px-safe-or-4 md:flex-col md:items-start md:border-t-0 md:px-4 md:pt-6">
        <Link
          href="/learn"
          className="hidden px-2 py-1 text-2xl font-bold tracking-wide text-primary-10 md:flex"
        >
          <Image
            source={require(`@/assets/logo/logotype.svg`)}
            className="h-[40px] w-[140px] shrink text-primary-12"
            tintColor="currentColor"
            contentFit="fill"
          />
        </Link>

        <TabTrigger name="Learn" href="/learn" asChild>
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

        {__DEV__ ? (
          <TabTrigger name="Explore" href="/explore" asChild>
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
                    Explore
                  </Text>
                  <DevLozenge />
                </>
              )}
            </TabButton>
          </TabTrigger>
        ) : null}

        <View className="hidden md:flex md:flex-1" />

        <Link
          href="/login"
          className="items-center rounded-md px-2 py-1 text-xl font-bold tracking-wide text-body hover:bg-primary-4 md:self-stretch"
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
  base: `size-[24px] flex-shrink`,
  variants: {
    isFocused: {
      true: `text-primary-12`,
      false: `text-primary-10`,
    },
  },
});

const buttonClass = tv({
  base: `rounded-md px-2 py-1 flex-row gap-2 items-center`,
});

const buttonTextClass = tv({
  base: `text-sm uppercase font-sans font-bold text-body hidden md:flex transition-colors`,
  variants: {
    isFocused: {
      true: `text-primary-12`,
      false: `text-primary-10`,
    },
  },
});
