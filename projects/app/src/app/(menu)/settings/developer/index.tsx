import { DeviceStoreToggleButton } from "@/client/ui/DeviceStoreToggleButton";
import {
  DebuggerHotkey,
  isDebuggerHotkeyAvailable,
} from "@/client/ui/DebuggerHotkey.utils";
import { useShortcutDisplayLabel } from "@/client/ui/hooks/useShortcut";
import { slowQueriesSetting } from "@/util/devtools";
import { Text } from "@/client/ui/Text";
import { View } from "@/client/ui/View";

export default function DeveloperSettingsPage() {
  const debuggerHotkeyLabel = useShortcutDisplayLabel(DebuggerHotkey);

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

      {isDebuggerHotkeyAvailable ? (
        <View className="gap-2">
          <Text className="pyly-body-dt">Hotkeys</Text>

          <View className="flex-row items-center justify-between">
            <Text className="pyly-body">Debugger</Text>
            <Text className="font-sans text-sm font-semibold text-muted-fg">
              {debuggerHotkeyLabel}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}
