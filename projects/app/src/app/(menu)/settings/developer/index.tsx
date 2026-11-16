import { DeviceStoreToggleButton } from "@/client/ui/DeviceStoreToggleButton";
import {
  SimpleCronIntervalKind,
  devThemeSwapIntervalSetting,
} from "@/client/theme";
import { DeviceStoreSelect } from "@/client/ui/DeviceStoreSelect";
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

const themeSwapIntervalOptions = [
  { value: null, label: `—` },
  { value: SimpleCronIntervalKind.Every5Seconds, label: `Every 5 seconds` },
  { value: SimpleCronIntervalKind.Every2Minutes, label: `Every 2 minutes` },
  { value: SimpleCronIntervalKind.Every5Minutes, label: `Every 5 minutes` },
  { value: SimpleCronIntervalKind.Hourly, label: `Hourly` },
  { value: SimpleCronIntervalKind.Daily, label: `Daily` },
] as const;

export default function DeveloperSettingsPage() {
  const debuggerHotkeyLabel = useShortcutDisplayLabel(DebuggerHotkey);

  return (
    <View className="gap-5">
      {/* Header */}
      <View>
        <Text className="pyly-body-title">Developer</Text>
      </View>

      <View className="gap-2">
        <SectionTitle>Appearance</SectionTitle>
        <View className="flex-row items-center gap-4">
          <View className="flex-1">
            <Text className="pyly-body-heading">Theme swapping</Text>
            <Text className="pyly-body-caption">
              Override the selected theme by alternating light and dark.
            </Text>
          </View>
          <DeviceStoreSelect
            entity={devThemeSwapIntervalSetting}
            entityFromValue={(value) =>
              value == null ? null : { interval: value }
            }
            valueFromEntity={(value) => value?.interval ?? null}
            accessibilityLabel="Theme swap interval"
            options={themeSwapIntervalOptions}
            placeholder="Choose a theme swap interval"
          />
        </View>
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
