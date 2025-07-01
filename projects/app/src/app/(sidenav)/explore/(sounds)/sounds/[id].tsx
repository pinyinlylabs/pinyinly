import { useLocalQuery } from "@/client/hooks/useLocalQuery";
import { useReplicache } from "@/client/hooks/useReplicache";
import { useRizzleQuery } from "@/client/hooks/useRizzleQuery";
import { Hhhmark } from "@/client/ui/Hhhmark";
import { RectButton } from "@/client/ui/RectButton";
import {
  loadHhhPinyinChart,
  pinyinPartPronunciationInstructionsAustralian,
} from "@/data/pinyin";
import { rMnemonicThemeId } from "@/data/rizzleSchema";
import { loadMnemonicThemeChoices } from "@/dictionary/dictionary";
import { sortComparatorString } from "@/util/collections";
import { nonNullable } from "@pinyinly/lib/invariant";

import { Link, useLocalSearchParams } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { tv } from "tailwind-variants";

export default function MnemonicIdPage() {
  const { id } = useLocalSearchParams<`/explore/sounds/[id]`>();
  const r = useReplicache();
  const chart = loadHhhPinyinChart();

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

  const group = chart.initials.find((x) =>
    x.initials.some((y) => y.includes(id)),
  );

  const groupItem = group?.initials.find((x) => x.includes(id));

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

  const pinyinPartId = `${nonNullable(groupItem?.[0])}-`;

  return (
    <ScrollView
      className="bg-bg"
      contentContainerClassName="max-w-[800px] self-center px-safe-or-4 pb-2 pt-safe-offset-4 px-safe-or-4"
    >
      <View className="mb-5 flex-row items-center gap-4">
        <View className={pinyinPartBox()}>
          <Text className="text-center font-cursive text-2xl text-fg">
            {pinyinPartId}
          </Text>
          <Text className={altText()} numberOfLines={1}>
            {groupItem
              ?.slice(1)
              .filter((x) => x.length > 0)
              .map((x) => `` + x)
              .join(` `)}
          </Text>
        </View>
        <Text className="text-3xl font-bold text-fg">
          {associationQuery.data?.name}
        </Text>
      </View>

      <View className="gap-2">
        <Text className="text-lg text-fg">
          others in this group ({group?.id}) — {group?.desc}
        </Text>
        <View className="flex-row flex-wrap gap-1">
          {group?.initials
            .slice()
            .sort(sortComparatorString(([x]) => x))
            .map(([i]) => (
              <Link key={i} href={`/explore/sounds/${i}`}>
                <Text className="text-fg">{i}-</Text>
              </Link>
            ))}
        </View>

        <View>
          <Text className="hhh-body-title">Pronunciation</Text>

          <Text className="hhh-body">
            <Hhhmark
              source={
                pinyinPartPronunciationInstructionsAustralian[pinyinPartId] ??
                ``
              }
              context={`body`}
            />
          </Text>
        </View>

        <View className="flex-row flex-wrap gap-1">
          <Text className="hhh-body-title">Association choices</Text>
        </View>

        <View className="gap-2">
          {choicesQuery.data == null ? (
            <Text className="text-fg">null</Text>
          ) : (
            [...choicesQuery.data.entries()]
              .flatMap(([themeId, initials]) => {
                const initial = initials.get(id);
                const themeName = rMnemonicThemeId().marshal(themeId);
                return initial
                  ? ([[themeId, themeName, initial]] as const)
                  : [];
              })
              .sort(
                // Put the current theme at the top.
                sortComparatorString(
                  ([themeId]) =>
                    `${themeId === groupTheme.data?.themeId ? 0 : 1}-${themeId}`,
                ),
              )
              .map(([themeId, themeName, initials], i) => (
                <View key={i}>
                  <Text className="hhh-body-heading">
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
                        variant="bare"
                      >
                        Use category
                      </RectButton>
                    )}
                  </Text>
                  {[...initials.entries()].map(([name, desc], i) => (
                    <View key={i} className="flex-row items-center gap-2">
                      <Text
                        className={`
                          text-caption

                          hover:text-fg
                        `}
                        onPress={() => {
                          void r.mutate.setPinyinInitialAssociation({
                            initial: id,
                            name,
                            now: new Date(),
                          });
                        }}
                      >
                        Use
                      </Text>
                      <Text className="font-bold text-fg">
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
              ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const altText = tv({
  base: `text-center text-caption`,
});

const pinyinPartBox = tv({
  base: `size-20 justify-center gap-1 rounded-xl bg-bg-1 p-2`,
});
