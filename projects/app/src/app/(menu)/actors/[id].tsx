import { Breadcrumbs } from "@/client/ui/Breadcrumbs";
import { HeaderTitleProvider } from "@/client/ui/HeaderTitleProvider";
import { InlineEditableSettingImage } from "@/client/ui/InlineEditableSettingImage";
import { InlineEditableSettingJson } from "@/client/ui/InlineEditableSettingJson";
import { InlineEditableSettingText } from "@/client/ui/InlineEditableSettingText";
import { trpc } from "@/client/trpc";
import { RectButton } from "@/client/ui/RectButton";
import { WikiTitledBox } from "@/client/ui/WikiTitledBox";
import { usePinyinSoundActors } from "@/client/ui/hooks/usePinyinSoundActors";
import { useUserSetting } from "@/client/ui/hooks/useUserSetting";
import type { ActorId, PinyinSoundId } from "@/data/model";
import {
  actorDescriptionTextSetting,
  actorIdentityImageSetting,
  actorSpecJsonSetting,
  actorModelSheetImageSetting,
  actorNameTextSetting,
} from "@/data/userSettings";
import { useLocalSearchParams, Link } from "expo-router";
import { Text, View } from "react-native";
import { useState } from "react";

export default function ActorIdPage() {
  const { id: rawId } = useLocalSearchParams<`/actors/[id]`>();
  const actorId = rawId as ActorId;
  const actorDirectory = usePinyinSoundActors();

  const actorNameSettingResult = useUserSetting({
    setting: actorNameTextSetting,
    key: { actorId },
  });
  const actorName = actorNameSettingResult.value?.text;

  const actor = actorDirectory.actors.find(
    (entry) => entry.actorId === actorId,
  );
  const name =
    actorName != null && actorName.trim().length > 0
      ? actorName
      : actor?.name != null && actor.name.trim().length > 0
        ? actor.name
        : null;

  const title = name ?? `Actor`;

  const linkedSoundIds: PinyinSoundId[] = [];
  for (const [
    soundId,
    selectedActorId,
  ] of actorDirectory.soundActorIdBySoundId) {
    if (selectedActorId === actorId) {
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
          setting={actorIdentityImageSetting}
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
          <InlineEditableSettingText
            textClassName="pyly-body-title"
            setting={actorNameTextSetting}
            settingKey={{ actorId }}
            placeholder="Actor name"
          />
        </View>

        <InlineEditableSettingText
          setting={actorDescriptionTextSetting}
          settingKey={{ actorId }}
          placeholder="Actor description"
          multiline
        />
      </View>

      <MnemonicSpecBox actorId={actorId} name={name} />

      <WikiTitledBox title="Model sheet">
        <View className="p-4">
          <InlineEditableSettingImage
            setting={actorModelSheetImageSetting}
            settingKey={{ actorId }}
            enableAiGeneration
            frameShape="rect"
            aspectRatio="1:1"
            previewHeight={220}
            tileSize={64}
          />
        </View>
      </WikiTitledBox>

      <WikiTitledBox title="Used by sounds">
        <View className="p-4">
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
      </WikiTitledBox>
    </View>
  );
}

function MnemonicSpecBox({
  actorId,
  name,
}: {
  actorId: ActorId;
  name: string | null;
}) {
  const [isEditMode, setIsEditMode] = useState(false);
  const generateActorSpecMutation = trpc.ai.enqueueActorSpec.useMutation();

  return (
    <WikiTitledBox title="Mnemonic Spec" onEditingChange={setIsEditMode}>
      <View className="gap-3 p-4">
        <InlineEditableSettingJson
          setting={actorSpecJsonSetting}
          settingKey={{ actorId }}
          placeholder='{"traits": ["curious"]}'
          autoResizeMinHeight={120}
        />

        {isEditMode ? (
          <View className="flex-row items-start gap-4 p-4">
            <RectButton
              variant="bare"
              iconStart="ai"
              iconSize={20}
              className="opacity-80"
              onPress={() => {
                if (name != null) {
                  generateActorSpecMutation.mutate({
                    actorId,
                    actorName: name,
                  });
                }
              }}
            >
              Use AI
            </RectButton>
          </View>
        ) : null}
      </View>
    </WikiTitledBox>
  );
}
