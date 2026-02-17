import { useAuth } from "@/client/auth";
import { RectButton } from "@/client/ui/RectButton";
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

  return (
    <View className="gap-5">
      {/* Header */}
      <View>
        <Text className="pyly-body-title">Profile</Text>
      </View>

      {/* Account Status */}
      <View className="gap-3 rounded-lg border bg-bg-high p-4">
        <Text className="text-sm text-fg-dim">Status</Text>
        {isAuthenticated ? (
          <>
            <Text className="text-base font-semibold text-fg">
              You&apos;re signed in
            </Text>
            <Text className="text-sm text-fg-dim">
              Your progress is synced across your devices.
            </Text>
            <RectButton onPressIn={handleSignOut} variant="filled">
              Sign out
            </RectButton>
          </>
        ) : (
          <>
            <Text className="text-base font-semibold text-fg">
              Not signed in
            </Text>
            <Text className="text-sm text-fg-dim">
              Create an account to save your progress and sync across devices.
            </Text>
            <RectButton onPressIn={handleSignIn}>
              Sign in or create account
            </RectButton>
          </>
        )}
      </View>
    </View>
  );
}
