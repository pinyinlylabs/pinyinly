import { FinalSoundTile } from "@/client/ui/FinalSoundTile";
import { Breadcrumbs } from "@/client/ui/Breadcrumbs";
import { HeaderTitleProvider } from "@/client/ui/HeaderTitleProvider";
import { RectButton } from "@/client/ui/RectButton";
import { usePinyinSoundLocations } from "@/client/ui/hooks/usePinyinSoundLocations";
import { Link } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

export default function LocationsPage() {
  const { locations, createLocation, isLoading } = usePinyinSoundLocations();
  const [lastCreatedLocationId, setLastCreatedLocationId] = useState<
    string | null
  >(null);

  return (
    <View className="gap-5">
      <Breadcrumbs>
        <Breadcrumbs.Item href="/locations">Locations</Breadcrumbs.Item>
      </Breadcrumbs>

      <View className="gap-2">
        <Text className="pyly-body-title">Locations</Text>
        <HeaderTitleProvider.ScrollTrigger title="Locations" />
        <Text className="font-sans text-sm text-muted-fg">
          Reusable location records for pinyin final tone scenes.
        </Text>
      </View>

      <View className="flex-row flex-wrap gap-2">
        <RectButton
          variant="filled"
          onPressIn={() => {
            const locationId = createLocation();
            setLastCreatedLocationId(locationId);
          }}
        >
          New location
        </RectButton>
        {isLoading ? (
          <Text className="self-center font-sans text-sm text-muted-fg">
            Loading...
          </Text>
        ) : null}
      </View>

      {lastCreatedLocationId == null ? null : (
        <Text className="font-sans text-xs text-muted-fg/70">
          Created location {lastCreatedLocationId}
        </Text>
      )}

      <View className="gap-3">
        {locations.length === 0 ? (
          <View className="rounded-lg border border-fg/10 bg-bg-high p-4">
            <Text className="font-sans text-sm text-muted-fg">
              No locations yet. Create one to start building the directory.
            </Text>
          </View>
        ) : null}

        <View className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-x-3.5 gap-y-6">
          {locations.map((location) => {
            return (
              <Link
                key={location.locationId}
                href={`/locations/${location.locationId}`}
                asChild
              >
                <FinalSoundTile
                  name={location.name}
                  image={location.identityImage}
                />
              </Link>
            );
          })}
        </View>
      </View>
    </View>
  );
}
