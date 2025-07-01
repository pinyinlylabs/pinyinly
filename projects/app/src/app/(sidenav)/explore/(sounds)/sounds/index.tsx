import { useRizzleQuery } from "@/client/hooks/useRizzleQuery";
import { useRizzleQueryPaged } from "@/client/hooks/useRizzleQueryPaged";
import { loadHhhPinyinChart, mnemonicThemeTitle } from "@/data/pinyin";
import {
  inverseSortComparator,
  sortComparatorNumber,
  sortComparatorString,
} from "@/util/collections";
import type { IsExhaustedRest } from "@/util/types";
import { Link } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { tv } from "tailwind-variants";

const tones = [
  { tone: 1, desc: `high and level` },
  { tone: 2, desc: `rising and questioning` },
  { tone: 3, desc: `mid-level and neutral` },
  { tone: 4, desc: `falling and definitive` },
  { tone: 5, desc: `light and short` },
];

export default function MnemonicsPage() {
  const chart = loadHhhPinyinChart();

  const initialAssociationsQuery = useRizzleQuery(
    [MnemonicsPage.name, `pinyinInitialAssociations`],
    async (r) =>
      await r.queryPaged.pinyinInitialAssociation
        .scan()
        .toArray()
        .then(
          (x) =>
            new Map(
              x.map(([, { initial, name }]) => {
                return [initial, name] as const;
              }),
            ),
        ),
  );

  const finalAssociationsQuery = useRizzleQueryPaged(
    [MnemonicsPage.name, `pinyinfinalAssociations`],
    async (r) =>
      await r.queryPaged.pinyinFinalAssociation
        .scan()
        .toArray()
        .then(
          (x) =>
            new Map(x.map(([, { final, name }]) => [final, name] as const)),
        ),
  );

  const initialGroupThemes = useRizzleQueryPaged(
    [MnemonicsPage.name, `initialGroupThemes`],
    async (r) =>
      await r.queryPaged.pinyinInitialGroupTheme
        .scan()
        .toArray()
        .then(
          (x) =>
            new Map(
              x.map(([, { groupId, themeId }]) => [groupId, themeId] as const),
            ),
        ),
  );

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerClassName="py-safe-offset-4 items-center"
    >
      <View className="max-w-[800px] gap-4 px-safe-or-4">
        <View
          className={`
            gap-2

            lg:px-0
          `}
        >
          <Text className="text-3xl font-bold text-fg">Sound elements</Text>
        </View>

        <>
          <View>
            <Text className="text-lg font-bold text-fg">Tones</Text>
          </View>
          <View
            className={`
              flex-row flex-wrap gap-3.5

              lg:gap-4
            `}
          >
            {tones.map(({ tone }) => (
              <ToneAssociationTile
                key={tone}
                tone={tone}
                name={undefined}
                hasAssociation={undefined}
              />
            ))}
          </View>

          <View className="border-t-2 border-bg-1"></View>

          <View>
            <Text className="text-lg font-bold text-fg">
              {Object.values(chart.initials)
                .map((v) => v.initials.length)
                .reduce((x1, x2) => x1 + x2, 0)}
              {` `}
              Initials
            </Text>
          </View>

          <View
            className={`
              gap-3.5

              lg:gap-10
            `}
          >
            {Object.entries(chart.initials)
              .sort(
                inverseSortComparator(
                  sortComparatorNumber(([, v]) => v.initials.length),
                ),
              )
              .map(([, { initials, desc, id }]) => {
                const themeId = initialGroupThemes.data?.get(id);
                return (
                  <View key={desc} className="gap-4">
                    <View className="flex-row gap-2">
                      <Text className="text-fg">
                        {initials.length} {desc}
                      </Text>
                      <Text className="text-caption">
                        {themeId == null
                          ? `no theme`
                          : mnemonicThemeTitle(themeId)}
                      </Text>
                    </View>
                    <View className="flex-row flex-wrap gap-3.5">
                      {[...initials]
                        .sort(sortComparatorString(([x]) => x))
                        .map(([initial]) => (
                          <Link
                            key={initial}
                            href={`/explore/sounds/${initial}`}
                            asChild
                          >
                            <AssociationTile
                              id={`${initial}-`}
                              name={initialAssociationsQuery.data?.get(initial)}
                              hasAssociation={initialAssociationsQuery.data?.has(
                                initial,
                              )}
                            />
                          </Link>
                        ))}
                    </View>
                  </View>
                );
              })}
          </View>

          <View className="border-t-2 border-bg-1"></View>

          <View>
            <Text className="text-lg font-bold text-fg">Finals</Text>
          </View>
          <View
            className={`
              flex-row flex-wrap gap-3.5

              lg:gap-4
            `}
          >
            {chart.finals.map(([final]) => (
              <AssociationTile
                key={final}
                id={`-${final}`}
                name={finalAssociationsQuery.data?.get(final)}
                hasAssociation={finalAssociationsQuery.data?.has(final)}
              />
            ))}
          </View>
        </>
      </View>
    </ScrollView>
  );
}

function toneToId(tone: number): string {
  switch (tone) {
    case 1: {
      return `¯`;
    }
    case 2: {
      return `´`;
    }
    case 3: {
      return `ˇ`;
    }
    case 4: {
      return `\``;
    }
    case 5: {
      return ``;
    }
    default: {
      throw new Error(`Unknown tone: ${tone}`);
    }
  }
}

const tileClass = tv({
  base: `
    size-24 items-center justify-center gap-3 rounded-xl bg-bg-1 p-2

    hover:bg-cyan/20
  `,
  variants: {
    hasAssociation: {
      true: ``,
    },
  },
});

function AssociationTile({
  id,
  name,
  hasAssociation = false,
  ...props
}: {
  id: string;
  name?: string;
  hasAssociation?: boolean;
}) {
  true satisfies IsExhaustedRest<typeof props>;

  return (
    <View
      {...props}
      className={tileClass({
        hasAssociation,
      })}
    >
      <Text className={`font-cursive text-2xl leading-none text-fg`}>{id}</Text>
      {name == null ? (
        <Text
          className="overflow-visible leading-none text-fg/20"
          numberOfLines={1}
        >
          ______
        </Text>
      ) : (
        <Text
          className="overflow-visible leading-none text-caption"
          numberOfLines={1}
        >
          {name}
        </Text>
      )}
    </View>
  );
}

function ToneAssociationTile({
  tone,
  name,
  hasAssociation = false,
  ...props
}: {
  tone: number;
  name?: string;
  hasAssociation?: boolean;
}) {
  true satisfies IsExhaustedRest<typeof props>;

  return (
    <View
      {...props}
      className={tileClass({
        hasAssociation,
      })}
    >
      <View className="items-center">
        <Text
          className={`-top-4 h-0 pt-2 text-4xl font-normal leading-none text-fg/20`}
        >
          {toneToId(tone)}
        </Text>
        <Text className="text-2xl leading-none text-fg">{tone}</Text>
      </View>
      {name == null ? (
        <Text
          className="overflow-visible leading-none text-fg/20"
          numberOfLines={1}
        >
          _____
        </Text>
      ) : (
        <Text
          className="overflow-visible leading-none text-caption"
          numberOfLines={1}
        >
          {name}
        </Text>
      )}
    </View>
  );
}
