import { useAuth } from "@/client/auth";
import { RectButton } from "@/client/ui/RectButton";
import { Icon } from "@/client/ui/Icon";
import { Lozenge } from "@/client/ui/Lozenge";
import { Text } from "@/client/ui/Text";
import { View } from "@/client/ui/View";
import { useRouter } from "expo-router";
import { Pressable, ScrollView } from "react-native";

export default function ProfileSwitchPage() {
  const auth = useAuth();
  const router = useRouter();

  if (auth.data == null) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <Text className="text-fg">Loading...</Text>
      </View>
    );
  }

  const { activeDeviceSession, allDeviceSessions } = auth.data;

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerClassName="min-h-full items-center justify-center px-6 py-12"
    >
      <View className="w-full max-w-lg gap-4">
        <View className="gap-1">
          <RectButton
            className="self-start"
            accessibilityLabel="Go back"
            variant="bareDim"
            iconStart="chevron-left"
            onPress={() => {
              router.back();
            }}
          >
            Switch profile
          </RectButton>
          <Text className="pyly-body text-muted-fg">
            Choose who&apos;s learning
          </Text>
        </View>

        <View className="overflow-hidden rounded-2xl bg-bg-high">
          {allDeviceSessions.map((session, index) => {
            const isActive =
              session.replicacheDbName === activeDeviceSession.replicacheDbName;
            const displayName =
              session.userName ??
              (session.serverSessionId == null ? `Anonymous` : `User`);

            return (
              <View key={session.replicacheDbName}>
                {index === 0 ? null : <View className="h-px bg-fg/10" />}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    isActive
                      ? `${displayName}, current profile`
                      : `Switch to ${displayName}`
                  }
                  accessibilityState={{ selected: isActive }}
                  className={
                    isActive
                      ? `
                        flex-row items-center gap-4 bg-fg/5 p-4 transition-colors

                        hover:bg-fg/10

                        active:bg-fg/10
                      `
                      : `
                        flex-row items-center gap-4 p-4 transition-colors

                        hover:bg-fg/5

                        active:bg-fg/10
                      `
                  }
                  onPress={() => {
                    const didSwitch = auth.logInToExistingDeviceSession(
                      (candidate) =>
                        candidate.replicacheDbName === session.replicacheDbName,
                    );
                    if (didSwitch) {
                      router.replace(`/profile`);
                    }
                  }}
                >
                  <View className="size-12 items-center justify-center rounded-full bg-fg/10">
                    <Icon icon="profile" size={24} />
                  </View>
                  <View className="flex-1">
                    <Text className="pyly-body font-semibold">
                      {displayName}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    {isActive ? (
                      <Lozenge color="muted-fg" size="sm">
                        CURRENT
                      </Lozenge>
                    ) : null}
                    <Icon icon="chevron-right" size={24} />
                  </View>
                </Pressable>
              </View>
            );
          })}

          <View className="h-px bg-fg/10" />
          <Pressable
            accessibilityRole="button"
            className="
              flex-row items-center gap-4 p-4 transition-colors

              hover:bg-fg/5

              active:bg-fg/10
            "
            onPress={() => {
              router.push(`/profile/add`);
            }}
          >
            <View className="size-12 items-center justify-center rounded-full border border-fg/20">
              <Icon icon="plus" size={24} />
            </View>
            <Text className="pyly-body font-semibold">Add profile</Text>
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          className="
            flex-row items-center gap-2 rounded-2xl p-4 transition-colors

            hover:bg-fg/5

            active:bg-fg/10
          "
          onPress={() => {
            auth.createGuestProfile();
            router.replace(`/learn`);
          }}
        >
          <View className="size-12 items-center justify-center">
            <Icon
              icon="person"
              size={24}
              tintColorClassName="accent-muted-fg"
            />
          </View>
          <View className="flex-1 gap-1">
            <Text className="pyly-body font-semibold">Try as guest</Text>
            <Text className="pyly-body-caption text-muted-fg">
              Start fresh without changing anyone&apos;s progress
            </Text>
          </View>
          <Icon
            icon="chevron-right"
            size={24}
            tintColorClassName="accent-muted-fg"
          />
        </Pressable>
      </View>
    </ScrollView>
  );
}
