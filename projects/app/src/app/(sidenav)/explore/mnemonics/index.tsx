import { useRizzleQuery } from "@/components/ReplicacheContext";
import { loadMmPinyinChart } from "@/dictionary/dictionary";
import { useQuery } from "@tanstack/react-query";
import fromAsync from "array-from-async";
import { Link } from "expo-router";
import { Fragment } from "react";
import { ScrollView, Text, View } from "react-native";
import { tv } from "tailwind-variants";

const tones = [
  { tone: 1, desc: `high and level` },
  { tone: 2, desc: `rising and questioning` },
  { tone: 3, desc: `mid-level and neutral` },
  { tone: 4, desc: `falling and definitive` },
  { tone: 5, desc: `light and short` },
];

const widths = [
  `w-[25%]`,
  `w-[0%]`,
  `w-[0%]`,
  `w-[10%]`,
  `w-[0%]`,
  `w-[0%]`,
  `w-[0%]`,
  `w-[75%]`,
  `w-[84%]`,
  `w-[0%]`,
  `w-[0%]`,
  `w-[5%]`,
  `w-[100%]`,
  `w-[43%]`,
];

export default function MnemonicsPage() {
  const query = useQuery({
    queryKey: [MnemonicsPage.name, `chart`],
    queryFn: async () => {
      return await loadMmPinyinChart();
    },
    throwOnError: true,
  });

  const initialAssociationsQuery = useRizzleQuery(
    [MnemonicsPage.name, `pinyinInitialAssociations`],
    async (r, tx) =>
      await fromAsync(r.query.pinyinInitialAssociation.scan(tx)).then(
        (x) =>
          new Map(x.map(([key, value]) => [key.initial, value.name] as const)),
      ),
  );

  const finalAssociationsQuery = useRizzleQuery(
    [MnemonicsPage.name, `pinyinfinalAssociations`],
    async (r, tx) => {
      return await fromAsync(r.query.pinyinFinalAssociation.scan(tx)).then(
        (x) =>
          new Map(x.map(([key, value]) => [key.final, value.name] as const)),
      );
    },
  );

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="py-safe-offset-4 items-center"
    >
      <View className="max-w-[800px] gap-4 px-safe-or-4">
        <View className="gap-2 lg:px-0">
          <Text className="text-3xl font-bold text-text">Mnemonics</Text>
        </View>

        {query.data == null ? (
          query.isLoading ? (
            <Text className="text-text">Loading</Text>
          ) : query.isError ? (
            <Text className="text-text">Error</Text>
          ) : (
            <Text className="text-text">unexpected state</Text>
          )
        ) : (
          <>
            <View className="">
              <Text className="text-lg font-bold text-text">Tones</Text>
            </View>
            <View className="flex-row flex-wrap gap-3.5 lg:gap-4">
              {tones.map(({ tone, desc }, i) => (
                <View
                  key={tone}
                  className="size-24 justify-center gap-2 rounded-xl bg-primary-3 px-2 hover:bg-primary-5 lg:size-24"
                >
                  <Text className="text-center font-cursive text-2xl text-text">
                    {tone}
                  </Text>
                  <Text
                    className="text-md text-md text-center text-primary-10"
                    numberOfLines={1}
                  >
                    {desc}
                  </Text>
                  <View className="h-2 rounded bg-primary-5">
                    <View
                      className={`h-2 ${widths[3 + (i % widths.length)] ?? ``} rounded bg-[yellow]`}
                    ></View>
                  </View>
                </View>
              ))}
            </View>

            <View className="border-t-2 border-primary-5"></View>

            <View className="">
              <Text className="text-lg font-bold text-text">Initials</Text>
            </View>

            <View className="gap-3.5 lg:gap-4">
              {Object.entries(query.data.initials).map(
                ([, { initials, desc }], i) => (
                  <Fragment key={desc}>
                    <View className="flex-0">
                      <Text className="text-md text-text">{desc}</Text>
                    </View>
                    <View className="flex-0 flex-row flex-wrap gap-3.5">
                      {initials.map(([initial, ...alts]) => (
                        <Link
                          key={initial}
                          href={`/explore/mnemonics/${initial}`}
                          asChild
                        >
                          <View
                            className={pinyinPartBox({
                              hasAssociation:
                                initialAssociationsQuery.data?.has(initial) ??
                                false,
                            })}
                          >
                            <Text className="text-center font-cursive text-2xl text-text">
                              {initial}-
                            </Text>
                            <Text className={altText()} numberOfLines={1}>
                              {alts
                                .filter((x) => x.length > 0)
                                .map((x) => `` + x)
                                .join(` `)}
                            </Text>
                            <View className="h-2 rounded bg-primary-5">
                              <View
                                className={`h-2 ${widths[1 + (i % widths.length)] ?? ``} rounded bg-[yellow]`}
                              ></View>
                            </View>
                          </View>
                        </Link>
                      ))}
                    </View>
                  </Fragment>
                ),
              )}
            </View>

            <View className="border-t-2 border-primary-5"></View>

            <View className="">
              <Text className="text-lg font-bold text-text">Finals</Text>
            </View>
            <View className="flex-row flex-wrap gap-3.5 lg:gap-4">
              {query.data.finals.map(([final, ...alts], i) => (
                <View
                  key={i}
                  className={pinyinPartBox({
                    hasAssociation:
                      finalAssociationsQuery.data?.has(final) ?? false,
                  })}
                >
                  <Text className="text-center font-cursive text-2xl text-text">
                    -{final}
                  </Text>
                  <Text className={altText()} numberOfLines={1}>
                    {alts
                      .filter((x) => x.length > 0)
                      .map((x) => `` + x)
                      .join(` `)}
                  </Text>
                  <View className="mt-2 h-2 rounded bg-primary-5">
                    <View
                      className={`h-2 ${widths[5 + (i % widths.length)] ?? ``} rounded bg-[yellow]`}
                    ></View>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const altText = tv({
  base: `text-md text-md text-center text-primary-10`,
});

const pinyinPartBox = tv({
  base: `size-24 justify-center gap-2 rounded-xl bg-primary-3 px-2 hover:bg-primary-5 lg:size-24`,
  variants: {
    hasAssociation: {
      true: `border-accent-10 border-2`,
    },
  },
});
