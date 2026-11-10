import { passkeyErrorMessage, useSupportsPasskeys } from "@/client/passkey";
import { useAuth } from "@/client/auth";
import { RectButton } from "@/client/ui/RectButton";
import { Text } from "@/client/ui/Text";
import { TextInputSingle } from "@/client/ui/TextInputSingle";
import { View } from "@/client/ui/View";
import { useRouter } from "expo-router";
import { useState } from "react";

export default function CreateAccountPage() {
  const auth = useAuth();
  const router = useRouter();
  const supported = useSupportsPasskeys();
  const [displayName, setDisplayName] = useState(``);
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (auth.data == null) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <Text className="text-fg">Loading...</Text>
      </View>
    );
  }

  const accountCreated = auth.data.activeDeviceSession.serverSessionId != null;

  async function handleCreateProfile() {
    const name = displayName.trim();
    if (pending || name.length === 0 || !supported) {
      return;
    }

    setPending(true);
    setErrorMessage(null);
    try {
      await auth.signUpWithPasskey({
        displayName: name,
        reuseCurrentDeviceSession: true,
      });
      router.replace(`/profile`);
    } catch (error) {
      console.error(`Profile creation failed`, error);
      setErrorMessage(passkeyErrorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <View className="flex-1 items-center justify-center bg-bg px-6 py-12">
      <View className="w-full max-w-lg gap-8">
        <View className="gap-2 text-center">
          <Text className="pyly-body-title">Create your profile</Text>
          <Text className="pyly-body text-muted-fg">
            Choose a name to back up your progress in the cloud and sync across
            devices.
          </Text>
        </View>

        <View className="gap-4 rounded-lg border border-fg/10 bg-bg-high p-6">
          {accountCreated ? (
            <View className="gap-4">
              <Text className="pyly-body-caption text-muted-fg">
                Your profile is created and this device is signed in. You can
                manage passkeys from Account security.
              </Text>
              <RectButton
                variant="filled"
                onPressIn={() => {
                  router.replace(`/profile`);
                }}
              >
                Continue to profile
              </RectButton>
            </View>
          ) : (
            <>
              <TextInputSingle
                autoFocus
                autoCorrect={false}
                placeholder="Display name"
                value={displayName}
                onChangeText={setDisplayName}
                onSubmitEditing={() => {
                  void handleCreateProfile();
                }}
                returnKeyType="done"
              />
              <Text className="pyly-body-caption text-muted-fg">
                You&apos;ll create a passkey to secure your profile.
              </Text>
              {!supported && (
                <Text className="pyly-body-caption text-muted-fg">
                  Profile creation requires a supported web browser on HTTPS or
                  localhost.
                </Text>
              )}
              {errorMessage == null ? null : (
                <Text accessibilityRole="alert" className="pyly-body-caption">
                  {errorMessage}
                </Text>
              )}
              <RectButton
                variant="filled"
                disabled={
                  displayName.trim().length === 0 || !supported || pending
                }
                onPressIn={() => {
                  void handleCreateProfile();
                }}
              >
                {pending ? `Creating account…` : `Create account with passkey`}
              </RectButton>
            </>
          )}
        </View>

        <View className="items-center">
          <RectButton
            variant="bare"
            onPressIn={() => {
              router.back();
            }}
          >
            Cancel
          </RectButton>
        </View>
      </View>
    </View>
  );
}
