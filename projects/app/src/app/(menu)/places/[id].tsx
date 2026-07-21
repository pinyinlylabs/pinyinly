import { Breadcrumbs } from "@/client/ui/Breadcrumbs";
import { HeaderTitleProvider } from "@/client/ui/HeaderTitleProvider";
import { InlineEditableSettingImage } from "@/client/ui/InlineEditableSettingImage";
import { InlineEditableSettingText } from "@/client/ui/InlineEditableSettingText";
import { WikiTitledBox } from "@/client/ui/WikiTitledBox";
import {
  locationSetRoles,
  usePinyinSoundPlaces,
} from "@/client/ui/hooks/usePinyinSoundPlaces";
import type { LocationSetRole } from "@/client/ui/hooks/usePinyinSoundPlaces";
import type { PlaceId } from "@/data/model";
import {
  getPinyinSoundLocationSetKeyParams,
  pinyinSoundLocationDescriptionSetting,
  pinyinSoundLocationIdentityImageSetting,
  pinyinSoundLocationNameSetting,
  pinyinSoundLocationSpecificationSetting,
  pinyinSoundLocationSetDescriptionSetting,
  pinyinSoundLocationSetIdentityImageSetting,
  pinyinSoundLocationSetNameSetting,
} from "@/data/userSettings";
import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

const locationSetTitles: Record<LocationSetRole, string> = {
  arrival: `Arrival`,
  heart: `Heart`,
  below: `Below`,
  ascent: `Ascent`,
  summit: `Summit`,
};

export default function PlaceIdPage() {
  const { id: rawId } = useLocalSearchParams<`/places/[id]`>();
  const placeId = (Array.isArray(rawId) ? rawId[0] : rawId) as PlaceId;
  const placeDirectory = usePinyinSoundPlaces();

  const place = placeDirectory.places.find(
    (entry) => entry.placeId === placeId,
  );
  const title =
    place?.name != null && place.name.trim().length > 0 ? place.name : `Place`;

  return (
    <View className="w-full gap-6 self-center pt-safe px-safe pb-2">
      <Breadcrumbs>
        <Breadcrumbs.Item href="/places">Places</Breadcrumbs.Item>
        <Breadcrumbs.Item>{title}</Breadcrumbs.Item>
      </Breadcrumbs>

      <HeaderTitleProvider.ScrollTrigger title={title} />

      <View className="items-center">
        <View className="w-[260px] overflow-hidden rounded-2xl">
          <InlineEditableSettingImage
            setting={pinyinSoundLocationIdentityImageSetting}
            settingKey={{ placeId }}
            enableAiGeneration
            frameShape="rect"
            aspectRatio="1:1"
            previewHeight={260}
            tileSize={64}
          />
        </View>
      </View>

      <View className="gap-3">
        <InlineEditableSettingText
          variant="title"
          setting={pinyinSoundLocationNameSetting}
          settingKey={{ placeId }}
          placeholder="Location name"
        />

        <InlineEditableSettingText
          setting={pinyinSoundLocationDescriptionSetting}
          settingKey={{ placeId }}
          placeholder="Location description"
          multiline
        />
      </View>

      <View className="gap-4">
        <Text className="pyly-body-caption text-fg-dim">Sets</Text>

        {locationSetRoles.map((role) => {
          const settingKey = getPinyinSoundLocationSetKeyParams(placeId, role);
          return (
            <WikiTitledBox
              key={role}
              title={locationSetTitles[role]}
              className="rounded-lg border border-fg/10 bg-bg-high p-4"
            >
              <View className="gap-3 p-1">
                <InlineEditableSettingText
                  setting={pinyinSoundLocationSetNameSetting}
                  settingKey={settingKey}
                  placeholder="Set name"
                />

                <InlineEditableSettingText
                  setting={pinyinSoundLocationSetDescriptionSetting}
                  settingKey={settingKey}
                  placeholder="Describe this set"
                  multiline
                />

                <InlineEditableSettingImage
                  setting={pinyinSoundLocationSetIdentityImageSetting}
                  settingKey={settingKey}
                  enableAiGeneration
                  frameShape="rect"
                  aspectRatio="5:4"
                  previewHeight={200}
                  tileSize={56}
                />
              </View>
            </WikiTitledBox>
          );
        })}
      </View>

      <WikiTitledBox
        title="Location specification JSON"
        className="rounded-lg border border-fg/10 bg-bg-high p-4"
      >
        <InlineEditableSettingText
          setting={pinyinSoundLocationSpecificationSetting}
          settingKey={{ placeId }}
          placeholder='{"location": "Aircraft hangar"}'
          multiline
        />
      </WikiTitledBox>
    </View>
  );
}
