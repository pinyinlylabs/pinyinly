import { HeaderProvider } from "@/client/ui/HeaderProvider";
import { useAuth } from "@/client/auth";
import { InlineEditableSettingText } from "@/client/ui/InlineEditableSettingText";
import { PasskeySettings } from "@/client/ui/PasskeySettings";
import { RectButton } from "@/client/ui/RectButton";
import { SessionInfoCard } from "@/client/ui/SessionInfoCard";
import { userDisplayNameTextSetting } from "@/data/userSettings";
import { useRouter } from "expo-router";
import { Platform } from "react-native";
import { Text } from "@/client/ui/Text";
import { View } from "@/client/ui/View";

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

  const handleSwitchProfile = () => {
    router.push(`/login/switch-profile`);
  };

  if (auth.data == null) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="font-sans text-fg">Loading...</Text>
      </View>
    );
  }

  return (
    <View className="gap-5">
      {/* Header */}
      <View>
        <Text className="pyly-body-title">Account</Text>
        <HeaderProvider.ScrollTrigger title="Account" />
      </View>

      {/* Current Account */}
      <View className="gap-3">
        <Text className="font-sans text-sm font-semibold text-fg">
          Current Account
        </Text>
        <SessionInfoCard
          session={auth.data.activeDeviceSession}
          isActive={true}
          showDetails={true}
        />
      </View>

      {/* Display Name Editor */}
      {isAuthenticated && (
        <View className="gap-3 rounded-lg border border-fg/10 bg-bg-high p-4">
          <Text className="font-sans text-sm text-muted-fg">Display Name</Text>
          <InlineEditableSettingText
            setting={userDisplayNameTextSetting}
            settingKey={{}}
            textClassName="pyly-body"
            placeholder="Enter display name"
          />
          <Text className="font-sans text-xs text-muted-fg/60">
            Updated automatically across your devices
          </Text>
        </View>
      )}

      {Platform.OS === `web` && isAuthenticated ? (
        <PasskeySettings key={auth.data.activeDeviceSession.serverSessionId} />
      ) : null}

      <View className="items-start gap-2">
        {isAuthenticated ? (
          <>
            <RectButton onPressIn={handleSwitchProfile} variant="bare">
              Switch profile
            </RectButton>
            <RectButton onPressIn={handleSignOut} variant="bare">
              Sign out
            </RectButton>
          </>
        ) : (
          <>
            <RectButton onPressIn={handleSignIn} variant="bare">
              Sign in or create account
            </RectButton>
            <RectButton onPressIn={handleSwitchProfile} variant="bare">
              Switch profile
            </RectButton>
          </>
        )}
      </View>
    </View>
  );
}
