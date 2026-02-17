import { useAuth } from "@/client/auth";
import { RectButton } from "@/client/ui/RectButton";
import { SessionInfoCard } from "@/client/ui/SessionInfoCard";
import { useRouter } from "expo-router";
import { ScrollView, Text, View } from "react-native";

export default function AccountsSettingsPage() {
  const auth = useAuth();
  const router = useRouter();

  if (auth.data == null) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-fg">Loading...</Text>
      </View>
    );
  }

  const { activeDeviceSession, allDeviceSessions } = auth.data;

  const handleSwitch = (replicacheDbName: string) => {
    auth.logInToExistingDeviceSession(
      (s) => s.replicacheDbName === replicacheDbName,
    );
  };

  const handleAddAccount = () => {
    router.push(`/login`);
  };

  return (
    <ScrollView className="flex-1">
      <View className="gap-5 p-4">
        {/* Header */}
        <View>
          <Text className="pyly-body-title">Accounts</Text>
          <Text className="text-sm text-fg-dim">
            Switch between accounts or add a new one
          </Text>
        </View>

        {/* Account List */}
        <View className="gap-3">
          {allDeviceSessions.map((session) => (
            <SessionInfoCard
              key={session.replicacheDbName}
              session={session}
              isActive={
                session.replicacheDbName ===
                activeDeviceSession.replicacheDbName
              }
              onSwitch={
                session.replicacheDbName ===
                activeDeviceSession.replicacheDbName
                  ? undefined
                  : () => {
                      handleSwitch(session.replicacheDbName);
                    }
              }
            />
          ))}
        </View>

        {/* Add Account Button */}
        <RectButton onPressIn={handleAddAccount} variant="filled">
          Add Account
        </RectButton>
      </View>
    </ScrollView>
  );
}
