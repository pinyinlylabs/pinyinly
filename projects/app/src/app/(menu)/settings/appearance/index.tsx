import { AiImageStyleSettingControl } from "@/client/ui/AiImageStyleSettingControl";
import { UserSettingToggleButton } from "@/client/ui/UserSettingToggleButton";
import {
  autoCheckUserToggleSetting,
  newSkillLessonUserToggleSetting,
  practiceMeaningUserToggleSetting,
  practicePronunciationUserToggleSetting,
  practiceWritingUserToggleSetting,
  studyBookmarksUserToggleSetting,
  studyHsk1UserToggleSetting,
  studyHsk2UserToggleSetting,
  studyHsk3UserToggleSetting,
  studyHsk4UserToggleSetting,
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
            <UserSettingToggleButton entity={autoCheckUserToggleSetting} />
          </View>
        </View>

        <View className="gap-2 pt-6">
          <Text className="pyly-body-dt">Skills to practice</Text>
          {practiceCategorySettings.map(({ title, description, entity }) => (
            <View key={title} className="flex-row items-center">
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
        <Text className="pyly-body-dt">Dictionary entries to study</Text>
        {studySourceSettings.map(({ title, entity }) => (
          <View key={title} className="flex-row items-center">
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
        <Text className="pyly-body-dt">Images</Text>
        <AiImageStyleSettingControl />
      </View>

      <View className="gap-2 pt-6">
        <Text className="pyly-body-dt">Experimental</Text>
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
      </View>
    </View>
  );
}
