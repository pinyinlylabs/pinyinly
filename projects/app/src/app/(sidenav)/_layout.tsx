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
import { ElementRef, forwardRef } from "react";
import { Pressable, Text, View } from "react-native";
import { useMediaQuery } from "react-responsive";
import { tv } from "tailwind-variants";

export default function SideNavLayout() {
  const isLg = useMediaQuery({ minWidth: 1024 });
  const isAuthenticated = useAuth().data?.clientSession.serverSessionId != null;

  return (
    <Tabs className="flex-1 flex-col-reverse items-stretch self-stretch bg-background lg:flex-row">
      <TabList className="flex-grow-0 items-center gap-4 justify-self-stretch border-t-2 border-primary-4 pt-2 pb-safe-or-2 px-safe-or-4 lg:flex-col lg:items-start lg:border-t-0 lg:px-4 lg:pt-6">
        {isLg ? (
          <Link
            href="/dashboard"
            className="px-2 py-1 text-2xl font-bold tracking-wide text-primary-10"
          >
            <Image
              source={require(`@/assets/logo/logotype.svg`)}
              className="h-[40px] w-[140px] flex-shrink text-primary-12"
              tintColor="currentColor"
              contentFit="fill"
            />
          </Link>
        ) : null}

        <TabTrigger name="Dashboard" href="/dashboard" asChild>
          <TabButton>{isLg ? `Dashboard` : `D`}</TabButton>
        </TabTrigger>

        {/* Required to allow these routes to work. */}
        <TabTrigger name="Radical" href="/radical/" asChild></TabTrigger>
        <TabTrigger name="Word" href="/word/[id]" asChild></TabTrigger>

        <TabTrigger name="Connections" href="/connections" asChild>
          <TabButton>{isLg ? `Connections` : `C`}</TabButton>
        </TabTrigger>

        <TabTrigger name="Radicals" href="/explore/radicals" asChild>
          <TabButton>{isLg ? `Radicals` : `R`}</TabButton>
        </TabTrigger>

        <TabTrigger name="Words" href="/explore/words" asChild>
          <TabButton>{isLg ? `Words` : `W`}</TabButton>
        </TabTrigger>

        <TabTrigger name="Mnemonics" href="/explore/mnemonics" asChild>
          <TabButton>{isLg ? `Mnemonics` : `M`}</TabButton>
        </TabTrigger>

        <TabTrigger name="History" href="/history" asChild>
          <TabButton>{isLg ? `History` : `H`}</TabButton>
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

      <View className="flex-1">
        <TabSlot />
      </View>

      <StatusBar style="auto" />
    </Tabs>
  );
}

const TabButton = forwardRef<ElementRef<typeof Pressable>, TabTriggerSlotProps>(
  (
    {
      children,
      isFocused,
      style, // pull out of `...props` and don't pass to <Pressable>
      ...props
    },
    forwardedRef,
  ) => (
    <Pressable {...props} ref={forwardedRef}>
      <Text className={buttonClass({ focused: isFocused })}>{children}</Text>
    </Pressable>
  ),
);
TabButton.displayName = `TabButton`;

const buttonClass = tv({
  base: `rounded-md px-2 py-1 text-xl font-bold text-text`,
  variants: {
    focused: {
      true: `text-primary-12`,
      false: `text-primary-10`,
    },
  },
});
