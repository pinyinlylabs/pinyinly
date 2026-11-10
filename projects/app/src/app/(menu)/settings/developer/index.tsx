import { DeviceStoreToggleButton } from "@/client/ui/DeviceStoreToggleButton";
import {
  DebuggerHotkey,
  isDebuggerHotkeyAvailable,
} from "@/client/ui/DebuggerHotkey.utils";
import { Kbd } from "@/client/ui/Kbd";
import { UserSettingToggleButton } from "@/client/ui/UserSettingToggleButton";
import { useShortcutDisplayLabel } from "@/client/ui/hooks/useShortcut";
import {
  newSkillLessonUserToggleSetting,
  profileOverviewUserToggleSetting,
  soundsPageUserToggleSetting,
} from "@/data/userSettings";
import { slowQueriesSetting } from "@/util/devtools";
import { Link } from "expo-router";
import { RectButton } from "@/client/ui/RectButton";
import { SectionTitle } from "@/client/ui/SectionTitle";
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
        <SectionTitle>Network</SectionTitle>

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

      <View className="gap-2">
        <SectionTitle>Experimental</SectionTitle>
        <View className="flex-row items-center">
          <View className="flex-1">
            <Text className="pyly-body-heading">New skill lesson</Text>
            <Text className="pyly-body-caption">
              Show a lesson modal when you encounter a new word.
            </Text>
          </View>
          <View>
            <UserSettingToggleButton
              entity={newSkillLessonUserToggleSetting}
              accessibilityLabel="New skill lesson"
            />
          </View>
        </View>
        <View className="flex-row items-center">
          <View className="flex-1">
            <Text className="pyly-body-heading">Sounds page</Text>
            <Text className="pyly-body-caption">
              Show the Sounds page and pronunciation box on wiki pages.
            </Text>
          </View>
          <View>
            <UserSettingToggleButton
              entity={soundsPageUserToggleSetting}
              accessibilityLabel="Sounds page"
            />
          </View>
        </View>
        <View className="flex-row items-center gap-4">
          <View className="flex-1">
            <Text className="pyly-body-heading">Profile overview</Text>
            <Text className="pyly-body-caption">
              Show the Overview section on your profile page.
            </Text>
          </View>
          <View>
            <UserSettingToggleButton
              entity={profileOverviewUserToggleSetting}
              accessibilityLabel="Profile overview"
            />
          </View>
        </View>
      </View>

      {isDebuggerHotkeyAvailable ? (
        <View className="gap-2">
          <SectionTitle>Hotkeys</SectionTitle>

          <View className="flex-row items-center justify-between">
            <Text className="pyly-body">Debugger</Text>
            <Kbd>{debuggerHotkeyLabel}</Kbd>
          </View>
        </View>
      ) : null}

      {__DEV__ ? (
        <Link href="/dev/demo" asChild>
          <RectButton variant="bare">Dev demo</RectButton>
        </Link>
      ) : null}
    </View>
  );
}
