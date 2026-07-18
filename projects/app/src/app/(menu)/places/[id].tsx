import { Breadcrumbs } from "@/client/ui/Breadcrumbs";
import { HeaderTitleProvider } from "@/client/ui/HeaderTitleProvider";
import { InlineEditableSettingImage } from "@/client/ui/InlineEditableSettingImage";
import { InlineEditableSettingText } from "@/client/ui/InlineEditableSettingText";
import { WikiTitledBox } from "@/client/ui/WikiTitledBox";
import {
  placeSublocationRoles,
  usePinyinSoundPlaces,
} from "@/client/ui/hooks/usePinyinSoundPlaces";
import type { PlaceSublocationRole } from "@/client/ui/hooks/usePinyinSoundPlaces";
import type { PlaceId } from "@/data/model";
import {
  getPinyinSoundPlaceSublocationKeyParams,
  pinyinSoundPlaceDescriptionSetting,
  pinyinSoundPlaceImageSetting,
  pinyinSoundPlaceNameSetting,
  pinyinSoundPlaceSublocationDescriptionSetting,
  pinyinSoundPlaceSublocationImageSetting,
  pinyinSoundPlaceSublocationNameSetting,
  pinyinSoundPlaceSublocationViewpointSetting,
} from "@/data/userSettings";
import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

const sublocationTitles: Record<PlaceSublocationRole, string> = {
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

      <View className="gap-3">
        <InlineEditableSettingText
          variant="title"
          setting={pinyinSoundPlaceNameSetting}
          settingKey={{ placeId }}
          placeholder="Place name"
        />

        <InlineEditableSettingText
          setting={pinyinSoundPlaceDescriptionSetting}
          settingKey={{ placeId }}
          placeholder="Place description"
          multiline
        />
      </View>

      <WikiTitledBox
        title="Hero image"
        className="rounded-lg border border-fg/10 bg-bg-high p-4"
      >
        <InlineEditableSettingImage
          setting={pinyinSoundPlaceImageSetting}
          settingKey={{ placeId }}
          enableAiGeneration
          frameShape="rect"
          aspectRatio="16:9"
          previewHeight={220}
          tileSize={64}
        />
      </WikiTitledBox>

      <View className="gap-4">
        <Text className="pyly-body-caption text-fg-dim">Sublocations</Text>

        {placeSublocationRoles.map((role) => {
          const settingKey = getPinyinSoundPlaceSublocationKeyParams(
            placeId,
            role,
          );
          return (
            <WikiTitledBox
              key={role}
              title={sublocationTitles[role]}
              className="rounded-lg border border-fg/10 bg-bg-high p-4"
            >
              <View className="gap-3 p-1">
                <InlineEditableSettingText
                  setting={pinyinSoundPlaceSublocationNameSetting}
                  settingKey={settingKey}
                  placeholder="Sublocation name"
                />

                <InlineEditableSettingText
                  setting={pinyinSoundPlaceSublocationViewpointSetting}
                  settingKey={settingKey}
                  placeholder="Viewpoint for this sublocation"
                  multiline
                />

                <InlineEditableSettingText
                  setting={pinyinSoundPlaceSublocationDescriptionSetting}
                  settingKey={settingKey}
                  placeholder="Describe this sublocation"
                  multiline
                />

                <InlineEditableSettingImage
                  setting={pinyinSoundPlaceSublocationImageSetting}
                  settingKey={settingKey}
                  enableAiGeneration
                  frameShape="rect"
                  aspectRatio="16:9"
                  previewHeight={200}
                  tileSize={56}
                />
              </View>
            </WikiTitledBox>
          );
        })}
      </View>
    </View>
  );
}
