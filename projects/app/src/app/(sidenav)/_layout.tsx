import { useAuth } from "@/client/auth";
import { DevLozenge } from "@/client/ui/DevLozenge";
import { IconImage } from "@/client/ui/IconImage";
import { Image } from "expo-image";
import { Link } from "expo-router";
import type { TabTriggerSlotProps } from "expo-router/ui";
import { TabList, Tabs, TabSlot, TabTrigger } from "expo-router/ui";
import { StatusBar } from "expo-status-bar";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { tv } from "tailwind-variants";

export default function SideNavLayout() {
  const isAuthenticated =
    useAuth().data?.activeDeviceSession.serverSessionId != null;

  return (
    <Tabs
      className={`
        flex-1 flex-col-reverse items-stretch self-stretch

        md:flex-row
      `}
    >
      <TabList
        className={`
          grow-0 items-center gap-4 justify-self-stretch border-t-2 border-bg pt-2 pb-safe-or-2
          px-safe-or-4

          md:flex-col md:items-start md:border-t-0 md:px-4 md:pt-6
        `}
      >
        <Link
          href="/learn"
          className={`
            hidden px-2 py-1 text-2xl font-bold tracking-wide

            md:flex
          `}
        >
          <Image
            source={require(`@/assets/logo/logotype.svg`)}
            className="h-[40px] w-[140px] shrink text-fg"
            tintColor="currentColor"
            contentFit="fill"
          />
        </Link>

        <TabTrigger name="Learn" href="/learn" asChild>
          <TabButton className={buttonClass()}>
            {({ isFocused }) => (
              <>
                <IconImage
                  source={
                    isFocused
                      ? require(`@/assets/icons/home-filled.svg`)
                      : require(`@/assets/icons/home.svg`)
                  }
                  className={iconClass({ isFocused })}
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
                  <IconImage
                    source={
                      isFocused
                        ? require(`@/assets/icons/bookmark-filled.svg`)
                        : require(`@/assets/icons/bookmark.svg`)
                    }
                    className={iconClass({ isFocused })}
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

        <View
          className={`
            hidden

            md:flex md:flex-1
          `}
        />

        <Link
          href="/login"
          className={`
            items-center rounded-md px-2 py-1 text-xl font-bold tracking-wide text-fg

            hover:bg-bg

            md:self-stretch
          `}
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

type TabButtonProps = Omit<TabTriggerSlotProps, `children` | `style`> & {
  children: ReactNode | ((options: { isFocused: boolean }) => ReactNode);
};

const TabButton = ({
  children,
  isFocused = false,
  ...props
}: TabButtonProps) => (
  <Pressable {...props}>
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
);

const iconClass = tv({
  variants: {
    isFocused: {
      true: `text-fg`,
      false: `text-fg-bg50`, // avoid using opacity because it doesn't work properly with the expo-image tintColor filter
    },
  },
});

const buttonClass = tv({
  base: `flex-row items-center gap-2 rounded-md px-2 py-1`,
});

const buttonTextClass = tv({
  base: `
    hidden font-sans text-sm font-bold uppercase text-fg transition-colors

    md:flex
  `,
  variants: {
    isFocused: {
      true: `text-fg`,
      false: `text-fg/50`,
    },
  },
});
