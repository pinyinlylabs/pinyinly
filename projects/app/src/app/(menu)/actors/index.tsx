import { HeaderTitleProvider } from "@/client/ui/HeaderTitleProvider";
import { InitialSoundTile } from "@/client/ui/InitialSoundTile";
import { RectButton } from "@/client/ui/RectButton";
import { usePinyinSoundActors } from "@/client/ui/hooks/usePinyinSoundActors";
import { Link } from "expo-router";
import { useState } from "react";
import { Text } from "@/client/ui/Text";
import { View } from "@/client/ui/View";

export default function ActorsPage() {
  const { actors, createActor, isLoading } = usePinyinSoundActors();
  const [lastCreatedActorId, setLastCreatedActorId] = useState<string | null>(
    null,
  );

  return (
    <View className="gap-5">
      <View className="gap-2">
        <Text className="pyly-body-title">Actors</Text>
        <HeaderTitleProvider.ScrollTrigger title="Actors" />
        <Text className="font-sans text-sm text-muted-fg">
          Reusable character and actor records for sound alternatives.
        </Text>
      </View>

      <View className="flex-row flex-wrap gap-2">
        <RectButton
          variant="filled"
          onPressIn={() => {
            const actorId = createActor();
            setLastCreatedActorId(actorId);
          }}
        >
          New actor
        </RectButton>
        {isLoading ? (
          <Text className="self-center font-sans text-sm text-muted-fg">
            Loading…
          </Text>
        ) : null}
      </View>

      {lastCreatedActorId == null ? null : (
        <Text className="font-sans text-xs text-muted-fg/70">
          Created actor {lastCreatedActorId}
        </Text>
      )}

      <View className="gap-3">
        {actors.length === 0 ? (
          <View className="rounded-lg border border-fg/10 bg-bg-high p-4">
            <Text className="font-sans text-sm text-muted-fg">
              No actors yet. Create one to start building the directory.
            </Text>
          </View>
        ) : null}

        <View className="grid grid-cols-[repeat(auto-fit,minmax(112px,1fr))] gap-x-3.5 gap-y-6">
          {actors.map((actor) => {
            return (
              <View key={actor.actorId}>
                <Link href={`/actors/${actor.actorId}`} asChild>
                  <InitialSoundTile name={actor.name} image={actor.image} />
                </Link>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}
