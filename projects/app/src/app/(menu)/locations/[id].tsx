import { Breadcrumbs } from "@/client/ui/Breadcrumbs";
import { trpc } from "@/client/trpc";
import { HeaderTitleProvider } from "@/client/ui/HeaderTitleProvider";
import { InlineEditableSettingImage } from "@/client/ui/InlineEditableSettingImage";
import { InlineEditableSettingJson } from "@/client/ui/InlineEditableSettingJson";
import { InlineEditableSettingText } from "@/client/ui/InlineEditableSettingText";
import { WikiTitledBox } from "@/client/ui/WikiTitledBox";
import { usePinyinSoundLocations } from "@/client/ui/hooks/usePinyinSoundLocations";
import { locationSetKeys } from "@/data/model";
import type { LocationId, LocationSetKey } from "@/data/model";
import {
  getLocationSetName,
  pinyinSoundLocationDescriptionSetting,
  locationIdentityImageSetting,
  pinyinSoundLocationNameSetting,
  locationSpecJsonSetting,
  locationSetDescriptionTextSetting,
  locationSetIdentityImageSetting,
  locationThoughtChainsJsonSetting,
} from "@/data/userSettings";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { RectButton } from "@/client/ui/RectButton";

export default function LocationIdPage() {
  const { id: rawId } = useLocalSearchParams<`/locations/[id]`>();
  const locationId = (Array.isArray(rawId) ? rawId[0] : rawId) as LocationId;
  const placeDirectory = usePinyinSoundLocations();
  const generateLocationSetIdentityImagesMutation =
    trpc.ai.enqueueLocationSetIdentityImages.useMutation();

  const place = placeDirectory.locations.find(
    (entry) => entry.locationId === locationId,
  );
  const title =
    place?.name != null && place.name.trim().length > 0 ? place.name : `Place`;

  return (
    <View className="w-full gap-6 self-center pt-safe px-safe pb-2">
      <Breadcrumbs>
        <Breadcrumbs.Item href="/locations">Locations</Breadcrumbs.Item>
        <Breadcrumbs.Item>{title}</Breadcrumbs.Item>
      </Breadcrumbs>

      <HeaderTitleProvider.ScrollTrigger title={title} />

      <View className="gap-1">
        <View className="w-[260px] overflow-hidden rounded-2xl">
          <InlineEditableSettingImage
            setting={locationIdentityImageSetting}
            settingKey={{ locationId: locationId }}
            enableAiGeneration
            frameShape="rect"
            aspectRatio="1:1"
            previewHeight={260}
            tileSize={64}
          />
        </View>
        <View className="flex-1 gap-0.5">
          <InlineEditableSettingText
            textClassName="font-sans text-3xl/10 font-bold"
            setting={pinyinSoundLocationNameSetting}
            settingKey={{ locationId: locationId }}
            placeholder="Location name"
          />

          <InlineEditableSettingText
            setting={pinyinSoundLocationDescriptionSetting}
            settingKey={{ locationId: locationId }}
            placeholder="Location description"
            multiline
          />
        </View>
      </View>

      <View className="gap-20">
        {locationSetKeys.map((setKey) => {
          return (
            <LocationSetBox
              key={setKey}
              locationId={locationId}
              setKey={setKey}
            />
          );
        })}
      </View>

      <WikiTitledBox title="Location specification JSON">
        <View className="gap-3 p-4">
          <InlineEditableSettingJson
            setting={locationSpecJsonSetting}
            settingKey={{ locationId: locationId }}
            placeholder='{"location": "Aircraft hangar"}'
          />

          <Pressable
            disabled={generateLocationSetIdentityImagesMutation.isPending}
            onPress={() => {
              generateLocationSetIdentityImagesMutation.mutate({
                locationId: locationId,
              });
            }}
            className="
              items-center rounded-xl border border-fg/10 bg-fg px-4 py-3

              disabled:opacity-40
            "
          >
            <Text className="pyly-body text-bg">
              {generateLocationSetIdentityImagesMutation.isPending
                ? `Generating all sets...`
                : `Generate all sets`}
            </Text>
          </Pressable>
        </View>
      </WikiTitledBox>

      <WikiTitledBox
        title="Thought chains"
        bottomCaption="Store candidates by final sound key, for example -ong. The highest score for the current sound is shown in sound location pickers."
      >
        <View className="p-4">
          <InlineEditableSettingJson
            setting={locationThoughtChainsJsonSetting}
            settingKey={{ locationId: locationId }}
            placeholder='{"-ong":[{"path":[{"anchor":"-ong"},{"anchor":"Giant gong","reason":"-ong echoes gong"},{"anchor":"Jungle Temple","reason":"A giant gong fits a temple"}],"score":92,"strengths":["Simple visual route"],"weaknesses":["Approximate vowel"]}]}'
            emptyStateText="No thought chains yet"
            autoResizeMinHeight={180}
          />
        </View>
      </WikiTitledBox>
    </View>
  );
}

export function LocationSetBox({
  locationId,
  setKey,
}: {
  locationId: LocationId;
  setKey: LocationSetKey;
}) {
  const [isEditMode, setIsEditMode] = useState(false);
  const enqueueLocationSetMutation = trpc.ai.enqueueLocationSet.useMutation();

  return (
    <WikiTitledBox
      title={getLocationSetName(setKey)}
      onEditingChange={setIsEditMode}
    >
      <InlineEditableSettingImage
        readonly={!isEditMode}
        setting={locationSetIdentityImageSetting}
        settingKey={{ locationId, setKey }}
        enableAiGeneration
        frameShape="rect"
        aspectRatio="5:4"
        previewHeight={200}
        tileSize={56}
      />

      <View className="mx-4 my-2">
        <InlineEditableSettingText
          readonly={!isEditMode}
          setting={locationSetDescriptionTextSetting}
          settingKey={{ locationId, setKey }}
          placeholder="Description"
          textClassName="text-sm text-fg-dim"
          multiline
        />
      </View>
      {isEditMode ? (
        <View className="flex-row items-start gap-4 p-4">
          <RectButton
            variant="bare"
            iconStart="ai"
            iconSize={20}
            className="opacity-80"
            onPress={() => {
              enqueueLocationSetMutation.mutate({
                locationId,
                setKey,
              });
            }}
          >
            Use AI
          </RectButton>
        </View>
      ) : null}
    </WikiTitledBox>
  );
}
