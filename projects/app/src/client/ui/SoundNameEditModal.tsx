import type { PinyinSoundId } from "@/data/model";
import {
  pinyinSoundGroupThemeSettingKey,
  pinyinSoundNameSetting,
} from "@/data/userSettings";
import { loadPinyinSoundNameSuggestions } from "@/dictionary";
import { sortComparatorString } from "@pinyinly/lib/collections";
import { use, useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import { InlineEditableSettingText } from "./InlineEditableSettingText";
import { PageSheetModal } from "./PageSheetModal";
import { RectButton } from "./RectButton";
import { usePinyinSoundGroups } from "./hooks/usePinyinSoundGroups";
import { useRizzle } from "./hooks/useRizzle";
import { useUserSetting } from "./hooks/useUserSetting";

interface SoundNameEditModalProps {
  soundId: PinyinSoundId;
  isOpen: boolean;
  onClose: () => void;
}

export function SoundNameEditModal({
  soundId,
  isOpen,
  onClose,
}: SoundNameEditModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <PageSheetModal onDismiss={onClose} suspenseFallback={null}>
      {({ dismiss }) => (
        <SoundNameEditModalContent soundId={soundId} onDismiss={dismiss} />
      )}
    </PageSheetModal>
  );
}

function SoundNameEditModalContent({
  soundId,
  onDismiss,
}: {
  soundId: PinyinSoundId;
  onDismiss: () => void;
}) {
  const r = useRizzle();
  const pinyinSoundGroups = usePinyinSoundGroups();
  const { setValue: setSoundName, value: currentSoundName } = useUserSetting({
    setting: pinyinSoundNameSetting,
    key: { soundId },
  });

  const soundNameSuggestions = use(loadPinyinSoundNameSuggestions());

  const pinyinSoundGroup = useMemo(() => {
    // Find which sound group this sound belongs to
    for (const group of pinyinSoundGroups.data) {
      for (const sound of group.sounds) {
        if (sound === soundId) {
          return group;
        }
      }
    }
    return null;
  }, [pinyinSoundGroups.data, soundId]);

  const suggestions = useMemo(() => {
    return [...soundNameSuggestions.entries()]
      .flatMap(([theme, namesBySoundId]) => {
        const names = namesBySoundId.get(soundId);
        return names ? ([[theme, names]] as const) : [];
      })
      .sort(
        // Put the current theme at the top.
        sortComparatorString(
          ([theme]) => `${theme === pinyinSoundGroup?.theme ? 0 : 1}-${theme}`,
        ),
      );
  }, [soundNameSuggestions, soundId, pinyinSoundGroup?.theme]);

  return (
    <View className="flex-1 bg-bg">
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-fg/10 px-4 py-3">
        <RectButton variant="bare" onPress={onDismiss}>
          Close
        </RectButton>
        <Text className="font-sans text-[17px] font-semibold text-fg-loud">
          Edit sound name
        </Text>
        <View className="w-12" />
      </View>

      {/* Input and suggestions */}
      <ScrollView className="flex-1 p-4">
        <View className="gap-4">
          {/* Text input */}
          <View className="gap-2">
            <Text className="font-sans text-sm font-semibold text-fg-dim">
              Sound name
            </Text>
            <InlineEditableSettingText
              setting={pinyinSoundNameSetting}
              settingKey={{ soundId }}
              placeholder="Name this sound"
            />
          </View>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <View className="gap-4">
              <Text className="text-sm font-semibold text-fg-dim">
                Suggestions
              </Text>

              <View className="gap-4">
                {suggestions.map(([theme, names]) => (
                  <View key={theme} className="gap-2">
                    <Text className="pyly-body-heading">
                      {theme}
                      {theme === pinyinSoundGroup?.theme ? (
                        ` ✅`
                      ) : (
                        <RectButton
                          onPress={() => {
                            if (pinyinSoundGroup?.id != null) {
                              void r.mutate.setSetting({
                                key: pinyinSoundGroupThemeSettingKey(
                                  pinyinSoundGroup.id,
                                ),
                                value: { t: theme },
                                now: new Date(),
                              });
                            }
                          }}
                          variant="bare"
                        >
                          Use theme
                        </RectButton>
                      )}
                    </Text>
                    {[...names.entries()].map(([name, nameDescription], i) => (
                      <View key={i} className="flex-row items-center gap-2">
                        <RectButton
                          onPress={() => {
                            setSoundName({ soundId, text: name });
                          }}
                          variant="bare"
                        >
                          <Text
                            className={`
                              text-fg-dim

                              hover:text-fg
                            `}
                          >
                            Use
                          </Text>
                        </RectButton>
                        <Text className="font-sans font-bold text-fg">
                          <Text
                            className={
                              currentSoundName?.text === name
                                ? `text-[green]`
                                : undefined
                            }
                          >
                            {name}
                          </Text>

                          {` `}
                          <Text className="font-sans text-sm font-normal text-fg-dim">
                            {nameDescription}
                          </Text>
                        </Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
