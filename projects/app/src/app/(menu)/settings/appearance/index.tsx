import { autoCheckUserSetting } from "@/client/hooks/useUserSetting";
import { UserSettingToggleButton } from "@/client/ui/UserSettingToggleButton";
import { Text, View } from "react-native";

export default function AppearanceSettingsPage() {
  return (
    <View className="gap-5">
      {/* Header */}
      <View>
        <Text className="pyly-body-title">Appearance</Text>
      </View>
      <View className="gap-2">
        <Text className="pyly-body-dt">Learning</Text>

        <View className="flex-row">
          <View className="flex-1">
            <Text className="pyly-body-heading">Auto check answers</Text>
            <Text className="pyly-body-caption">
              Automatically check the answer rather than needing to press
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
