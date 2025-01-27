import { ReferencePage } from "@/client/ui/ReferencePage";
import { ReferencePageBodySection } from "@/client/ui/ReferencePageBodySection";
import { ReferencePageHeader } from "@/client/ui/ReferencePageHeader";
import { useReplicache } from "@/client/ui/ReplicacheContext";
import { GradientAqua } from "@/client/ui/styles";
import { skillsForRadical } from "@/data/generator";
import {
  lookupRadicalByHanzi,
  lookupRadicalNameMnemonics,
  lookupRadicalPinyinMnemonics,
} from "@/dictionary/dictionary";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { ScrollView, Text, View } from "react-native";

export default function RadicalPage() {
  const r = useReplicache();
  const { id } = useLocalSearchParams<`/radical/[id]`>();

  const query = useQuery({
    queryKey: [`character.radical`, id],
    queryFn: async () => {
      const [radical, nameMnemonics, pinyinMnemonics] = await Promise.all([
        lookupRadicalByHanzi(id),
        lookupRadicalNameMnemonics(id),
        lookupRadicalPinyinMnemonics(id),
      ]);
      return { radical, nameMnemonics, pinyinMnemonics };
    },
    throwOnError: true,
  });

  const radical = query.data?.radical;
  const skills = radical != null ? skillsForRadical(radical) : null;

  const skillStatesQuery = useQuery({
    queryKey: [`radical.skills`, id, radical?.name.join(`, `)],
    queryFn: async () => {
      if (skills == null) {
        return null;
      }
      const skillStates = await r.replicache.query(async (tx) =>
        Promise.all(
          skills.map(
            async (skill) =>
              [skill, await r.query.skillState.get(tx, { skill })] as const,
          ),
        ),
      );
      return skillStates;
    },
    throwOnError: true,
  });

  return (
    <ScrollView>
      <ReferencePage
        header={
          <ReferencePageHeader
            gradientColors={GradientAqua}
            title={id}
            subtitle={query.data?.radical?.name[0] ?? null}
          />
        }
        body={
          query.isLoading ? (
            <Text className="text-text">Loading</Text>
          ) : query.isError ? (
            <Text className="text-text">Error</Text>
          ) : (
            <>
              {skillStatesQuery.isLoading ? (
                <Text className="text-text">Loading</Text>
              ) : skillStatesQuery.isError ? (
                <Text className="text-text">Error</Text>
              ) : (
                <View>
                  <Text className="text-text">
                    {skillStatesQuery.data?.length ?? 0} skills:
                  </Text>
                  <View>
                    {skillStatesQuery.data?.map(([skill, skillState], i) => (
                      <View key={i}>
                        <Text className="text-text">
                          {i}: {skill.hanzi} {skill.type} ::{` `}
                          {skillState == null
                            ? `no data`
                            : `due: ` + skillState.createdAt.toISOString()}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {query.data?.nameMnemonics != null ? (
                <ReferencePageBodySection title="Name mnemonics">
                  <View className="flex-col gap-2">
                    {query.data.nameMnemonics.map(
                      ({ mnemonic, rationale }, i) => (
                        <View key={i} className="gap-1">
                          <Text className="text-md text-text">{mnemonic}</Text>
                          <Text className="text-xs italic text-primary-10">
                            {rationale}
                          </Text>
                        </View>
                      ),
                    )}
                  </View>
                </ReferencePageBodySection>
              ) : null}
              {query.data?.pinyinMnemonics != null ? (
                <ReferencePageBodySection title="Pinyin mnemonics">
                  <View className="flex-col gap-2">
                    {query.data.pinyinMnemonics.map(
                      ({ mnemonic, strategy: rationale }, i) => (
                        <View key={i} className="gap-1">
                          <Text className="text-md text-text">{mnemonic}</Text>
                          <Text className="text-xs italic text-primary-10">
                            {rationale}
                          </Text>
                        </View>
                      ),
                    )}
                  </View>
                </ReferencePageBodySection>
              ) : null}
              {query.data?.radical != null ? (
                <ReferencePageBodySection title="Meaning">
                  {query.data.radical.name.join(`, `)}
                </ReferencePageBodySection>
              ) : null}
              {query.data?.radical?.pinyin != null ? (
                <ReferencePageBodySection title="Pinyin">
                  {query.data.radical.pinyin.join(`, `)}
                </ReferencePageBodySection>
              ) : null}
            </>
          )
        }
      />
    </ScrollView>
  );
}
