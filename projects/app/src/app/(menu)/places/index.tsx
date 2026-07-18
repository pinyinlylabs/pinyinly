import { FinalSoundTile } from "@/client/ui/FinalSoundTile";
import { Breadcrumbs } from "@/client/ui/Breadcrumbs";
import { HeaderTitleProvider } from "@/client/ui/HeaderTitleProvider";
import { RectButton } from "@/client/ui/RectButton";
import { usePinyinSoundPlaces } from "@/client/ui/hooks/usePinyinSoundPlaces";
import { Link } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

export default function PlacesPage() {
  const { places, createPlace, isLoading } = usePinyinSoundPlaces();
  const [lastCreatedPlaceId, setLastCreatedPlaceId] = useState<string | null>(
    null,
  );

  return (
    <View className="gap-5">
      <Breadcrumbs>
        <Breadcrumbs.Item href="/places">Places</Breadcrumbs.Item>
      </Breadcrumbs>

      <View className="gap-2">
        <Text className="pyly-body-title">Places</Text>
        <HeaderTitleProvider.ScrollTrigger title="Places" />
        <Text className="font-sans text-sm text-fg-dim">
          Reusable location records for pinyin final tone scenes.
        </Text>
      </View>

      <View className="flex-row flex-wrap gap-2">
        <RectButton
          variant="filled"
          onPressIn={() => {
            const placeId = createPlace();
            setLastCreatedPlaceId(placeId);
          }}
        >
          New place
        </RectButton>
        {isLoading ? (
          <Text className="self-center font-sans text-sm text-fg-dim">
            Loading...
          </Text>
        ) : null}
      </View>

      {lastCreatedPlaceId == null ? null : (
        <Text className="font-sans text-xs text-fg-dim/70">
          Created place {lastCreatedPlaceId}
        </Text>
      )}

      <View className="gap-3">
        {places.length === 0 ? (
          <View className="rounded-lg border border-fg/10 bg-bg-high p-4">
            <Text className="font-sans text-sm text-fg-dim">
              No places yet. Create one to start building the directory.
            </Text>
          </View>
        ) : null}

        <View className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-x-3.5 gap-y-6">
          {places.map((place) => {
            return (
              <Link
                key={place.placeId}
                href={`/places/${place.placeId}`}
                asChild
              >
                <FinalSoundTile
                  label=""
                  name={place.name}
                  image={place.identityImage}
                />
              </Link>
            );
          })}
        </View>
      </View>
    </View>
  );
}
