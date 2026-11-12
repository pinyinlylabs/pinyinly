import { RectButton } from "@/client/ui/RectButton";
import { Icon } from "@/client/ui/Icon";
import { Text } from "@/client/ui/Text";
import { View } from "@/client/ui/View";
import { useRouter } from "expo-router";
import { Pressable, ScrollView } from "react-native";

export default function AddProfilePage() {
  const router = useRouter();

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerClassName="min-h-full items-center justify-center px-6 py-12"
    >
      <View className="w-full max-w-lg gap-8">
        <RectButton
          className="self-start"
          accessibilityLabel="Go back"
          variant="bareDim"
          iconStart="chevron-left"
          onPress={() => {
            router.back();
          }}
        >
          Back
        </RectButton>

        <View className="gap-2">
          <Text className="pyly-body-title text-3xl">Add a profile</Text>
          <Text className="pyly-body text-muted-fg">
            Sign in to an existing profile or create a new one.
          </Text>
        </View>

        <View className="overflow-hidden rounded-2xl bg-bg-high">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign in to an existing profile"
            className="
              flex-row items-center gap-4 p-4 transition-colors

              hover:bg-fg/5

              active:bg-fg/10
            "
            onPress={() => {
              router.push(`/login`);
            }}
          >
            <View className="size-12 items-center justify-center rounded-full bg-fg/10">
              <Icon icon="lock" size={24} />
            </View>
            <View className="flex-1 gap-1">
              <Text className="pyly-body font-semibold">Sign in</Text>
              <Text className="pyly-body-caption text-muted-fg">
                Continue learning with an existing profile
              </Text>
            </View>
            <Icon icon="chevron-right" size={24} />
          </Pressable>

          <View className="h-px bg-fg/10" />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create a new profile"
            className="
              flex-row items-center gap-4 p-4 transition-colors

              hover:bg-fg/5

              active:bg-fg/10
            "
            onPress={() => {
              router.push(`/login/create-profile`);
            }}
          >
            <View className="size-12 items-center justify-center rounded-full bg-fg/10">
              <Icon icon="plus" size={24} />
            </View>
            <View className="flex-1 gap-1">
              <Text className="pyly-body font-semibold">
                Create new profile
              </Text>
              <Text className="pyly-body-caption text-muted-fg">
                Start fresh with a new learning profile
              </Text>
            </View>
            <Icon icon="chevron-right" size={24} />
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
