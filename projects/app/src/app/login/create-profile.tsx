import { useAuth } from "@/client/auth";
import { RectButton } from "@/client/ui/RectButton";
import { Text } from "@/client/ui/Text";
import { TextInputSingle } from "@/client/ui/TextInputSingle";
import { View } from "@/client/ui/View";
import { useRouter } from "expo-router";
import { useState } from "react";

export default function CreateProfilePage() {
  const auth = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState(``);

  if (auth.data == null) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <Text className="text-fg">Loading...</Text>
      </View>
    );
  }

  const handleContinue = () => {
    const name = displayName.trim();
    if (name.length === 0) {
      return;
    }

    auth.createLocalProfile(name);
    router.replace(`/profile`);
  };

  return (
    <View className="flex-1 items-center justify-center bg-bg px-6 py-12">
      <View className="w-full max-w-lg gap-8">
        <View className="gap-2 text-center">
          <Text className="pyly-body-title">Add another profile</Text>
          <Text className="pyly-body text-muted-fg">
            Choose a name for your new profile.
          </Text>
        </View>

        <View className="gap-4 rounded-lg border border-fg/10 bg-bg-high p-6">
          <Text className="pyly-body-heading">Display name</Text>
          <TextInputSingle
            autoFocus
            placeholder="Enter a name"
            value={displayName}
            onChangeText={setDisplayName}
            onSubmitEditing={handleContinue}
            returnKeyType="done"
          />
          <Text className="pyly-body-caption text-muted-fg">
            This profile and its learning progress are stored on this device.
          </Text>
          <RectButton
            variant="filled"
            disabled={displayName.trim().length === 0}
            onPressIn={handleContinue}
          >
            Continue
          </RectButton>
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
