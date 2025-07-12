import { DeviceStoreToggleButton } from "@/client/ui/DeviceStoreToggleButton";
import { slowQueriesSetting } from "@/util/devtools";
import { Text, View } from "react-native";

export default function DeveloperSettingsPage() {
  return (
    <View className="gap-5">
      {/* Header */}
      <View>
        <Text className="pyly-body-title">Developer</Text>
      </View>

      <View className="gap-2">
        <Text className="pyly-body-dt">Network</Text>

        <View className="flex-row">
          <View className="flex-1">
            <Text className="pyly-body-heading">Slow queries</Text>
            <Text className="pyly-body-caption">
              Artificially increase local and network query latency by 1000 ms.
            </Text>
          </View>
          <View>
            <DeviceStoreToggleButton entity={slowQueriesSetting} />
          </View>
        </View>
      </View>
    </View>
  );
}
