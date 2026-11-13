import { AiImageStyleSettingControl } from "@/client/ui/AiImageStyleSettingControl";
import { Breadcrumbs } from "@/client/ui/Breadcrumbs";
import { HeaderProvider } from "@/client/ui/HeaderProvider";
import { SectionTitle } from "@/client/ui/SectionTitle";
import {
  ColorSchemeOverrideKind,
  colorSchemeOverrideSetting,
} from "@/client/theme";
import { DeviceStoreSelect } from "@/client/ui/DeviceStoreSelect";
import { UserSettingToggleButton } from "@/client/ui/UserSettingToggleButton";
import { Select } from "@/client/ui/Select";
import { useUserSetting } from "@/client/ui/hooks/useUserSetting";
import {
  autoCheckUserToggleSetting,
  practiceMeaningUserToggleSetting,
  practicePronunciationUserToggleSetting,
  practiceWritingUserToggleSetting,
  soundEffectsUserToggleSetting,
  studyBookmarksUserToggleSetting,
  studyHsk1UserToggleSetting,
  studyHsk2UserToggleSetting,
  studyHsk3UserToggleSetting,
  studyHsk4UserToggleSetting,
  defaultMeaningWeakWordRepeatCount,
  meaningWeakWordRepeatCountSetting,
  defaultPronunciationWeakWordRepeatCount,
  pronunciationWeakWordRepeatCountSetting,
  defaultWritingWeakWordRepeatCount,
  writingWeakWordRepeatCountSetting,
} from "@/data/userSettings";
import { Text } from "@/client/ui/Text";
import { View } from "@/client/ui/View";

const practiceCategorySettings = [
  {
    title: `Meaning`,
    description: `Practice remembering what Hanzi words mean.`,
    entity: practiceMeaningUserToggleSetting,
  },
  {
    title: `Pronunciation`,
    description: `Practice remembering how Hanzi words are pronounced.`,
    entity: practicePronunciationUserToggleSetting,
  },
  {
    title: `Writing`,
    description: `Practice writing individual Hanzi characters.`,
    entity: practiceWritingUserToggleSetting,
  },
] as const;

const studySourceSettings = [
  { title: `Bookmarks`, entity: studyBookmarksUserToggleSetting },
  { title: `HSK 1`, entity: studyHsk1UserToggleSetting },
  { title: `HSK 2`, entity: studyHsk2UserToggleSetting },
  { title: `HSK 3`, entity: studyHsk3UserToggleSetting },
  { title: `HSK 4`, entity: studyHsk4UserToggleSetting },
] as const;

const colorSchemeOverrideOptions = [
  { value: `auto`, label: `System default` },
  { value: ColorSchemeOverrideKind.Light, label: `Light` },
  { value: ColorSchemeOverrideKind.Dark, label: `Dark` },
] as const;

const weakWordRepeatCountOptions = [
  { value: `1`, label: `1` },
  { value: `2`, label: `2` },
  { value: `3`, label: `3` },
  { value: `4`, label: `4` },
  { value: `5`, label: `5` },
] as const;

export default function SettingsPage() {
  const writingWeakWordRepeatSetting = useUserSetting({
    setting: writingWeakWordRepeatCountSetting,
  });
  const meaningWeakWordRepeatSetting = useUserSetting({
    setting: meaningWeakWordRepeatCountSetting,
  });
  const pronunciationWeakWordRepeatSetting = useUserSetting({
    setting: pronunciationWeakWordRepeatCountSetting,
  });

  return (
    <View className="gap-5">
      {/* Header */}
      <View className="gap-1">
        <Breadcrumbs>
          <Breadcrumbs.Item href="/settings">Settings</Breadcrumbs.Item>
        </Breadcrumbs>
        <HeaderProvider.ScrollTrigger title="Settings" />
      </View>
      <View className="gap-2">
        <SectionTitle>Theme</SectionTitle>
        <View className="flex-row items-center gap-4">
          <View className="flex-1">
            <Text className="pyly-body-heading">Dark mode</Text>
            <Text className="pyly-body-caption">
              Auto follows your device&apos;s appearance.
            </Text>
          </View>
          <DeviceStoreSelect
            entity={colorSchemeOverrideSetting}
            entityFromValue={(value) =>
              value === `auto` ? null : { mode: value }
            }
            errorMessage="Could not save your color scheme override. Please try again."
            valueFromEntity={(value) => value?.mode ?? `auto`}
            accessibilityLabel="Color scheme"
            options={colorSchemeOverrideOptions}
            placeholder="Choose a color scheme"
          />
        </View>
      </View>
      <View className="gap-2">
        <SectionTitle>Sound</SectionTitle>
        <View className="flex-row items-center gap-4">
          <View className="flex-1">
            <Text className="pyly-body-heading">Sound effects</Text>
            <Text className="pyly-body-caption">
              Play sounds when interacting with audio controls.
            </Text>
          </View>
          <View>
            <UserSettingToggleButton
              entity={soundEffectsUserToggleSetting}
              accessibilityLabel="Sound effects"
            />
          </View>
        </View>
      </View>
      <View className="gap-2">
        <SectionTitle>Learning</SectionTitle>

        <View className="flex-row gap-4">
          <View className="flex-1">
            <Text className="pyly-body-heading">Auto check answers</Text>
            <Text className="pyly-body-caption">
              Automatically check the answer rather than needing to press
              &quot;Check&quot;.
            </Text>
          </View>
          <View>
            <UserSettingToggleButton entity={autoCheckUserToggleSetting} />
          </View>
        </View>

        <View className="flex-row items-center gap-4">
          <View className="flex-1">
            <Text className="pyly-body-heading">
              Repeat meaning after a mistake
            </Text>
            <Text className="pyly-body-caption">
              Number of correct meaning answers required for a weak word.
            </Text>
          </View>
          <Select
            accessibilityLabel="Meaning repeat count"
            options={weakWordRepeatCountOptions}
            value={String(
              meaningWeakWordRepeatSetting.value?.count ??
                defaultMeaningWeakWordRepeatCount,
            )}
            onValueChange={(value) => {
              meaningWeakWordRepeatSetting.setValue({ count: Number(value) });
            }}
            placeholder="Choose a repeat count"
            disabled={meaningWeakWordRepeatSetting.isLoading}
          />
        </View>

        <View className="flex-row items-center gap-4">
          <View className="flex-1">
            <Text className="pyly-body-heading">
              Repeat pronunciation after a mistake
            </Text>
            <Text className="pyly-body-caption">
              Number of correct pinyin answers required for a weak word.
            </Text>
          </View>
          <Select
            accessibilityLabel="Pronunciation repeat count"
            options={weakWordRepeatCountOptions}
            value={String(
              pronunciationWeakWordRepeatSetting.value?.count ??
                defaultPronunciationWeakWordRepeatCount,
            )}
            onValueChange={(value) => {
              pronunciationWeakWordRepeatSetting.setValue({
                count: Number(value),
              });
            }}
            placeholder="Choose a repeat count"
            disabled={pronunciationWeakWordRepeatSetting.isLoading}
          />
        </View>

        <View className="flex-row items-center gap-4">
          <View className="flex-1">
            <Text className="pyly-body-heading">
              Repeat writing after a mistake
            </Text>
            <Text className="pyly-body-caption">
              Number of correct writing answers required for a weak word.
            </Text>
          </View>
          <Select
            accessibilityLabel="Writing repeat count"
            options={weakWordRepeatCountOptions}
            value={String(
              writingWeakWordRepeatSetting.value?.count ??
                defaultWritingWeakWordRepeatCount,
            )}
            onValueChange={(value) => {
              writingWeakWordRepeatSetting.setValue({ count: Number(value) });
            }}
            placeholder="Choose a repeat count"
            disabled={writingWeakWordRepeatSetting.isLoading}
          />
        </View>

        <View className="gap-2 pt-6">
          <SectionTitle>Skills to practice</SectionTitle>
          {practiceCategorySettings.map(({ title, description, entity }) => (
            <View key={title} className="flex-row items-center gap-4">
              <View className="flex-1">
                <Text className="pyly-body-heading">{title}</Text>
                <Text className="pyly-body-caption">{description}</Text>
              </View>
              <View>
                <UserSettingToggleButton
                  entity={entity}
                  accessibilityLabel={title}
                />
              </View>
            </View>
          ))}
        </View>
      </View>

      <View className="gap-2 pt-6">
        <SectionTitle>Dictionary entries to study</SectionTitle>
        {studySourceSettings.map(({ title, entity }) => (
          <View key={title} className="flex-row items-center gap-4">
            <View className="flex-1">
              <Text className="pyly-body-heading">{title}</Text>
            </View>
            <View>
              <UserSettingToggleButton
                entity={entity}
                accessibilityLabel={title}
              />
            </View>
          </View>
        ))}
      </View>

      <View className="gap-2 pt-6">
        <SectionTitle>Images</SectionTitle>
        <AiImageStyleSettingControl />
      </View>
    </View>
  );
}
