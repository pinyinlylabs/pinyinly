import { useLocalQuery } from "@/client/hooks/useLocalQuery";
import { RectButton } from "@/client/ui/RectButton";
import { useReplicache, useRizzleQuery } from "@/client/ui/ReplicacheContext";
import { loadHhhPinyinChart } from "@/data/pinyin";
import { rMnemonicThemeId } from "@/data/rizzleSchema";
import { loadMnemonicThemeChoices } from "@/dictionary/dictionary";

import { Link, useLocalSearchParams } from "expo-router";
import { ScrollView, Text, View } from "react-native";

export default function MnemonicIdPage() {
  const { id } = useLocalSearchParams<`/explore/mnemonics/[id]`>();
  const r = useReplicache();

  const query = useLocalQuery({
    queryKey: [MnemonicIdPage.name, `chart`],
    queryFn: () => loadHhhPinyinChart(),
  });

  const choicesQuery = useLocalQuery({
    queryKey: [MnemonicIdPage.name, `mnemonicThemeChoices`],
    queryFn: () => loadMnemonicThemeChoices(),
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
    x.initials.some((y) => y.includes(id)),
  );

  const groupTheme = useRizzleQuery(
    [MnemonicIdPage.name, `groupTheme`, group?.id],
    async (r, tx) => {
      if (group?.id == null) {
        return null;
      }
      const res = await r.query.pinyinInitialGroupTheme.get(tx, {
        groupId: group.id,
      });
      return res ?? null;
    },
  );

  return (
    <ScrollView
      className="bg-bg"
      contentContainerClassName="max-w-[800px] self-center px-safe-or-4 pb-2 pt-safe-offset-4 px-safe-or-4"
    >
      <View>
        <Text className="text-3xl text-fg">{id}-</Text>
      </View>

      <View className="gap-2">
        <Text className="text-lg text-fg">
          others in this group ({group?.id}) — {group?.desc}
        </Text>
        <View className="flex-row flex-wrap gap-1">
          {group?.initials.map(([i]) => (
            <Link key={i} href={`/explore/mnemonics/${i}`}>
              <Text className="text-fg">{i}-</Text>
            </Link>
          ))}
        </View>

        <View className="flex-row flex-wrap gap-1">
          <Text className="text-xl text-fg">Association choices</Text>
        </View>

        <View className="gap-2">
          {choicesQuery.data == null
            ? null
            : [...choicesQuery.data.entries()]
                .flatMap(([themeId, initials]) => {
                  const initial = initials.get(id);
                  const themeName = rMnemonicThemeId().marshal(themeId);
                  return initial
                    ? ([[themeId, themeName, initial]] as const)
                    : [];
                })
                .map(([themeId, themeName, initials], i) => (
                  <View key={i}>
                    <Text className="text-lg text-fg">
                      {themeName}
                      {themeId === groupTheme.data?.themeId ? (
                        ` ✅`
                      ) : (
                        <RectButton
                          onPress={() => {
                            if (group?.id != null) {
                              void r.mutate.setPinyinInitialGroupTheme({
                                groupId: group.id,
                                themeId,
                                now: new Date(),
                              });
                            }
                          }}
                        >
                          Use
                        </RectButton>
                      )}
                    </Text>
                    {[...initials.entries()].map(([name, desc], i) => (
                      <View key={i}>
                        <Text
                          className="font-bold text-fg"
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
                          <Text className="text-sm font-normal text-caption">
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
