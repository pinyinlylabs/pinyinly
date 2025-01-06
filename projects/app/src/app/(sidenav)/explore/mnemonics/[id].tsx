import { useReplicache, useRizzleQuery } from "@/components/ReplicacheContext";
import {
  loadMmPinyinChart,
  loadMnemonicThemeChoices,
} from "@/dictionary/dictionary";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocalSearchParams } from "expo-router";
import { ScrollView, Text, View } from "react-native";

export default function MnemonicIdPage() {
  const { id } = useLocalSearchParams<`/explore/mnemonics/[id]`>();
  const r = useReplicache();

  const query = useQuery({
    queryKey: [MnemonicIdPage.name, `chart`],
    queryFn: async () => {
      return await loadMmPinyinChart();
    },
    throwOnError: true,
  });

  const choicesQuery = useQuery({
    queryKey: [MnemonicIdPage.name, `mnemonicThemeChoices`],
    queryFn: async () => {
      return await loadMnemonicThemeChoices();
    },
    throwOnError: true,
  });

  const associationQuery = useRizzleQuery(
    [MnemonicIdPage.name, `association`, id],
    async (r, tx) => {
      const res = await r.query.pinyinInitialAssociation.get(tx, {
        initial: id,
      });
      return res ?? null;
    },
  );

  const group = query.data?.initials.find((x) =>
    x.initials.find((y) => y.includes(id)),
  );

  return (
    <ScrollView
      className="flex-1 items-center pt-safe-offset-4 px-safe-or-4"
      contentContainerClassName="px-safe-or-4 flex-1 pb-2 w-[800px]"
    >
      <View>
        <Text className="text-3xl text-text">{id}-</Text>
      </View>

      <View className="gap-2">
        <Text className="text-lg text-text">
          others in this group ({group?.id}) — {group?.desc}
        </Text>
        <View className="flex-row flex-wrap gap-1">
          {group?.initials.map(([i]) => (
            <Link key={i} href={`/explore/mnemonics/${i}`}>
              <Text className="text-md text-text">{i}-</Text>
            </Link>
          ))}
        </View>

        <View className="flex-row flex-wrap gap-1">
          <Text className="text-xl text-text">Association choices</Text>
        </View>

        <View className="gap-2">
          {choicesQuery.data == null
            ? null
            : [...choicesQuery.data.entries()]
                .flatMap(([theme, initials]) => {
                  const initial = initials.get(id);
                  return initial ? ([[theme, initial]] as const) : [];
                })
                .map(([theme, initials], i) => (
                  <View key={i} className="">
                    <Text className="text-lg text-text">{theme}</Text>
                    {[...initials.entries()].map(([name, desc], i) => (
                      <View key={i}>
                        <Text
                          className="text-md font-bold text-text"
                          onPress={() => {
                            void r.mutate.setPinyinInitialAssociation({
                              initial: id,
                              name,
                              now: new Date(),
                            });
                          }}
                        >
                          <Text
                            className={
                              associationQuery.data?.name === name
                                ? `text-[green]`
                                : undefined
                            }
                          >
                            {name}
                          </Text>

                          {` `}
                          <Text className="text-sm font-normal text-primary-10">
                            {desc}
                          </Text>
                        </Text>
                      </View>
                    ))}
                  </View>
                ))}
        </View>
      </View>
      <View></View>
    </ScrollView>
  );
}
