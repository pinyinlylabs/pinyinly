import { autoCheckUserSetting } from "@/client/hooks/useUserSetting";
import { UserSettingToggleButton } from "@/client/ui/UserSettingToggleButton";
import { Text, View } from "react-native";

export default function AppearanceSettingsPage() {
  return (
    <View className="gap-5">
      {/* Header */}
      <View>
        <Text className="hhh-body-title">Appearance</Text>
      </View>
      <View className="gap-2">
        <Text className="hhh-body-dt">Network</Text>

        <View className="flex-row">
          <View className="flex-1">
            <Text className="hhh-body-heading">Auto check answers</Text>
            <Text className="hhh-body-caption">
              Automatically check the answer instead of needing to press
              &quot;Check&quot;.
            </Text>
          </View>
          <View>
            <UserSettingToggleButton entity={autoCheckUserSetting} />
          </View>
        </View>
      </View>
    </View>
  );
}
