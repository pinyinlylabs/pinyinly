import { useAuth } from "@/client/auth";
import { Icon } from "@/client/ui/Icon";
import { Text } from "@/client/ui/Text";
import { View } from "@/client/ui/View";
import { useRouter } from "expo-router";
import { Pressable, ScrollView } from "react-native";

export default function SwitchProfilePage() {
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
      <View className="w-full max-w-lg gap-8">
        <View className="gap-2 text-center">
          <Text className="pyly-body-title">Switch profile</Text>
          <Text className="pyly-body text-muted-fg">
            Choose from profiles saved on this device
          </Text>
        </View>

        <View className="overflow-hidden rounded-2xl border-2 border-fg/15 bg-bg-high">
          {allDeviceSessions.map((session, index) => {
            const isActive =
              session.replicacheDbName === activeDeviceSession.replicacheDbName;
            const displayName =
              session.userName ??
              (session.serverSessionId == null ? `Anonymous` : `User`);
            const description =
              session.authMethod === `apple`
                ? `Apple account`
                : session.authMethod === `passkey`
                  ? `Passkey account`
                  : `Device profile`;

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
                  className="flex-row items-center gap-4 p-4"
                  disabled={isActive}
                  onPress={() => {
                    const didSwitch = auth.logInToExistingDeviceSession(
                      (candidate) =>
                        candidate.replicacheDbName === session.replicacheDbName,
                    );
                    if (didSwitch) {
                      router.replace(`/learn`);
                    }
                  }}
                >
                  <View className="size-12 items-center justify-center rounded-full bg-fg/10">
                    <Icon icon="profile-filled" size={24} />
                  </View>
                  <View className="flex-1 gap-1">
                    <Text className="pyly-body-title">{displayName}</Text>
                    <Text className="pyly-body-caption text-muted-fg">
                      {description}
                    </Text>
                  </View>
                  {isActive ? (
                    <Text className="pyly-body-caption text-muted-fg">
                      Current
                    </Text>
                  ) : (
                    <Icon icon="chevron-right" size={24} />
                  )}
                </Pressable>
              </View>
            );
          })}

          <View className="h-px bg-fg/10" />
          <Pressable
            accessibilityRole="button"
            className="flex-row items-center gap-4 p-4"
            onPress={() => {
              router.push(`/login`);
            }}
          >
            <View className="size-12 items-center justify-center rounded-full border border-fg/20">
              <Icon icon="plus" size={24} />
            </View>
            <Text className="pyly-body-title text-muted-fg">
              Add another account
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
