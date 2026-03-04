import { useAuth } from "@/client/auth";
import { InlineEditableSettingText } from "@/client/ui/InlineEditableSettingText";
import { RectButton } from "@/client/ui/RectButton";
import { SessionInfoCard } from "@/client/ui/SessionInfoCard";
import { userNameSetting } from "@/data/userSettings";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";

export default function ProfileSettingsPage() {
  const auth = useAuth();
  const router = useRouter();

  const isAuthenticated =
    auth.data?.activeDeviceSession.serverSessionId != null;

  const handleSignIn = () => {
    router.push(`/login`);
  };

  const handleSignOut = () => {
    auth.signOut();
  };

  const handleManageAccounts = () => {
    router.push(`/settings/accounts`);
  };

  if (auth.data == null) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-fg">Loading...</Text>
      </View>
    );
  }

  return (
    <View className="gap-5">
      {/* Header */}
      <View>
        <Text className="pyly-body-title">Account</Text>
      </View>

      {/* Current Account */}
      <View className="gap-3">
        <Text className="text-sm font-semibold text-fg">Current Account</Text>
        <SessionInfoCard
          session={auth.data.activeDeviceSession}
          isActive={true}
          showDetails={true}
        />
      </View>

      {/* Account Name Editor */}
      {isAuthenticated && (
        <View className="gap-3 rounded-lg border border-fg/10 bg-bg-high p-4">
          <Text className="text-sm text-fg-dim">Account Name</Text>
          <InlineEditableSettingText
            variant="body"
            setting={userNameSetting}
            settingKey={{}}
            placeholder="Enter account name"
            displayClassName="text-base"
          />
        </View>
      )}

      {/* Account Management */}
      <View className="gap-3 rounded-lg border bg-bg-high p-4">
        <Text className="text-sm text-fg-dim">Account Management</Text>

        {isAuthenticated ? (
          <>
            <Text className="text-base font-semibold text-fg">
              You&apos;re signed in
            </Text>
            <Text className="text-sm text-fg-dim">
              Your progress is synced across your devices.
            </Text>
            <View className="gap-2">
              <RectButton onPressIn={handleManageAccounts} variant="filled">
                Manage Accounts
              </RectButton>
              <RectButton onPressIn={handleSignOut}>Sign out</RectButton>
            </View>
          </>
        ) : (
          <>
            <Text className="text-base font-semibold text-fg">
              Not signed in
            </Text>
            <Text className="text-sm text-fg-dim">
              Create an account to save your progress and sync across devices.
            </Text>
            <View className="gap-2">
              <RectButton onPressIn={handleSignIn} variant="filled">
                Sign in or create account
              </RectButton>
              <RectButton onPressIn={handleManageAccounts}>
                Manage Accounts
              </RectButton>
            </View>
          </>
        )}
      </View>
    </View>
  );
}
