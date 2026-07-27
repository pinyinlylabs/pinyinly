import { Breadcrumbs } from "@/client/ui/Breadcrumbs";
import { HeaderTitleProvider } from "@/client/ui/HeaderTitleProvider";
import { InlineEditableSettingImage } from "@/client/ui/InlineEditableSettingImage";
import { InlineEditableSettingJson } from "@/client/ui/InlineEditableSettingJson";
import { InlineEditableSettingText } from "@/client/ui/InlineEditableSettingText";
import { RectButton } from "@/client/ui/RectButton";
import { WikiTitledBox } from "@/client/ui/WikiTitledBox";
import { usePinyinSoundActors } from "@/client/ui/hooks/usePinyinSoundActors";
import { useUserSetting } from "@/client/ui/hooks/useUserSetting";
import type { ActorId, PinyinSoundId } from "@/data/model";
import {
  pinyinSoundActorDescriptionSetting,
  pinyinSoundActorImageSetting,
  pinyinSoundActorMnemonicIdentitySetting,
  pinyinSoundActorModelSheetImageSetting,
  pinyinSoundActorNameSetting,
} from "@/data/userSettings";
import { useLocalSearchParams, Link } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

export default function ActorIdPage() {
  const { id: rawId } = useLocalSearchParams<`/actors/[id]`>();
  const actorId = (Array.isArray(rawId) ? rawId[0] : rawId) as ActorId;
  const actorDirectory = usePinyinSoundActors();

  const actorNameSetting = useUserSetting({
    setting: pinyinSoundActorNameSetting,
    key: { actorId },
  });
  const actorName = actorNameSetting.value?.text;

  const actor = actorDirectory.actors.find(
    (entry) => entry.actorId === actorId,
  );
  const title =
    actorName != null && actorName.trim().length > 0
      ? actorName
      : actor?.name != null && actor.name.trim().length > 0
        ? actor.name
        : `Actor`;

  const [isNameEditingEnabled, setIsNameEditingEnabled] = useState(false);

  const linkedSoundIds: PinyinSoundId[] = [];
  for (const [soundId, actorIds] of actorDirectory.soundActorIdsBySoundId) {
    if (actorIds.includes(actorId)) {
      linkedSoundIds.push(soundId);
    }
  }
  linkedSoundIds.sort();

  return (
    <View className="w-full gap-6 self-center pt-safe px-safe pb-2">
      <Breadcrumbs>
        <Breadcrumbs.Item href="/actors">Actors</Breadcrumbs.Item>
        <Breadcrumbs.Item>{title}</Breadcrumbs.Item>
      </Breadcrumbs>

      <HeaderTitleProvider.ScrollTrigger title={title} />

      <View className="items-center">
        <InlineEditableSettingImage
          setting={pinyinSoundActorImageSetting}
          settingKey={{ actorId }}
          enableAiGeneration
          frameShape="circle"
          aspectRatio="1:1"
          previewHeight={180}
          tileSize={64}
          className="w-full max-w-[260px]"
        />
      </View>

      <View className="gap-3">
        <View className="flex-row items-center gap-2 self-start">
          {isNameEditingEnabled ? (
            <InlineEditableSettingText
              textClassName="pyly-body-title"
              setting={pinyinSoundActorNameSetting}
              settingKey={{ actorId }}
              placeholder="Actor name"
            />
          ) : (
            <Text className="pyly-body-title">{title}</Text>
          )}

          <RectButton
            onPress={() => {
              setIsNameEditingEnabled((value) => !value);
            }}
            variant="bare"
            iconStart="pencil"
          />
        </View>

        <InlineEditableSettingText
          setting={pinyinSoundActorDescriptionSetting}
          settingKey={{ actorId }}
          placeholder="Actor description"
          multiline
        />
      </View>

      <WikiTitledBox
        title="Mnemonic Identity"
        className="rounded-lg border border-fg/10 bg-bg-high p-4"
      >
        <InlineEditableSettingJson
          setting={pinyinSoundActorMnemonicIdentitySetting}
          settingKey={{ actorId }}
          placeholder='{"traits": ["curious"]}'
          autoResizeMinHeight={120}
        />
      </WikiTitledBox>

      <WikiTitledBox
        title="Model sheet"
        className="rounded-lg border border-fg/10 bg-bg-high p-4"
      >
        <InlineEditableSettingImage
          setting={pinyinSoundActorModelSheetImageSetting}
          settingKey={{ actorId }}
          enableAiGeneration
          frameShape="rect"
          aspectRatio="16:9"
          previewHeight={220}
          tileSize={64}
        />
      </WikiTitledBox>

      <View className="gap-3 rounded-lg border border-fg/10 bg-bg-high p-4">
        <Text className="pyly-body-caption text-fg-dim">Used by sounds</Text>
        {linkedSoundIds.length === 0 ? (
          <Text className="pyly-body-caption text-fg-dim">
            Not currently selected by any sound.
          </Text>
        ) : (
          <View className="flex-row flex-wrap gap-2">
            {linkedSoundIds.map((soundId) => (
              <Link key={soundId} href={`/sounds/${soundId}`} asChild>
                <RectButton variant="option">{soundId}</RectButton>
              </Link>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}
