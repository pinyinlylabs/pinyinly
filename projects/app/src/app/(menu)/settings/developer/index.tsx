import { DeviceStorageToggleButton } from "@/client/ui/DeviceStorageToggleButton";
import { slowQueriesSetting } from "@/util/devtools";
import { Text, View } from "react-native";

export default function DeveloperSettingsPage() {
  return (
    <View className="gap-5">
      {/* Header */}
      <View>
        <Text className="hhh-body-title">Developer</Text>
      </View>

      <View className="gap-2">
        <Text className="hhh-body-dt">Network</Text>

        <View className="flex-row">
          <View className="flex-1">
            <Text className="hhh-body-heading">Slow queries</Text>
            <Text className="hhh-body-caption">
              Artificially increase local and network query latency by 1000 ms.
            </Text>
          </View>
          <View>
            <DeviceStorageToggleButton entity={slowQueriesSetting} />
          </View>
        </View>
      </View>
    </View>
  );
}
