import { useAuth } from "@/client/ui/auth";
import { Image } from "expo-image";
import { Link, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ScrollView, View } from "react-native";
import { useMediaQuery } from "react-responsive";

export default function SideNavLayout() {
  const isLg = useMediaQuery({ minWidth: 1024 });
  const isAuthenticated = useAuth().data?.clientSession.serverSessionId != null;

  return (
    <View className="flex-1 flex-col-reverse items-stretch self-stretch bg-background lg:flex-row">
      <ScrollView
        horizontal={!isLg}
        centerContent={!isLg}
        className="flex-grow-0 border-t-2 border-primary-4 pt-2 pb-safe-or-2 lg:max-h-full lg:border-t-0"
        contentContainerClassName="h-full items-center lg:items-start gap-4 px-safe-or-4 lg:px-4 lg:pt-4"
      >
        <Link
          href="/dashboard"
          className="px-2 py-1 text-2xl font-bold tracking-wide text-primary-10"
        >
          {isLg ? (
            <Image
              source={require(`@/assets/logo/logotype.svg`)}
              className="h-[40px] w-[140px] flex-shrink text-primary-12"
              tintColor="currentColor"
              contentFit="fill"
            />
          ) : (
            <Image
              source={require(`@/assets/logo/logomark.svg`)}
              className="h-[40px] w-[40px] flex-shrink text-primary-12"
              tintColor="currentColor"
              contentFit="fill"
            />
          )}
        </Link>

        <Link
          href="/learn/reviews"
          className="items-center rounded-md px-2 py-1 text-xl font-bold tracking-wide text-text hover:bg-primary-4 lg:self-stretch"
        >
          Reviews
        </Link>

        <Link
          href="/explore/radicals"
          className="items-center rounded-md px-2 py-1 text-xl font-bold tracking-wide text-text hover:bg-primary-4 lg:self-stretch"
        >
          Radicals
        </Link>
        <Link
          href="/explore/words"
          className="items-center rounded-md px-2 py-1 text-xl font-bold tracking-wide text-text hover:bg-primary-4 lg:self-stretch"
        >
          Words
        </Link>
        <Link
          href="/explore/mnemonics"
          className="items-center rounded-md px-2 py-1 text-xl font-bold tracking-wide text-text hover:bg-primary-4 lg:self-stretch"
        >
          Mnemonics
        </Link>

        <Link
          href="/history"
          className="items-center rounded-md px-2 py-1 text-xl font-bold tracking-wide text-text hover:bg-primary-4 lg:self-stretch"
        >
          History
        </Link>

        <Link
          href="/connections"
          className="items-center rounded-md px-2 py-1 text-xl font-bold tracking-wide text-text hover:bg-primary-4 lg:self-stretch"
        >
          Connections
        </Link>

        <Link
          href="/dev/ui"
          className="items-center rounded-md px-2 py-1 text-xl font-bold tracking-wide text-text hover:bg-primary-4 lg:self-stretch"
        >
          UI
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
      </ScrollView>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" options={{ presentation: `modal` }} />
      </Stack>
      <StatusBar style="auto" />
    </View>
  );
}
