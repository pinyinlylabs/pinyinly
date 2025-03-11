import { ReferencePage } from "@/client/ui/ReferencePage";
import { ReferencePageBodySection } from "@/client/ui/ReferencePageBodySection";
import { ReferencePageHeader } from "@/client/ui/ReferencePageHeader";
import { GradientAqua } from "@/client/ui/styles";
import { HanziWord } from "@/data/model";
import {
  lookupHanziWord,
  lookupHanziWordGlossMnemonics,
  lookupHanziWordPinyinMnemonics,
} from "@/dictionary/dictionary";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { ScrollView, Text, View } from "react-native";

export default function RadicalPage() {
  const { id } = useLocalSearchParams<`/explore/radicals/[id]`>();

  const query = useQuery({
    queryKey: [`character.radical`, id],
    queryFn: async () => {
      const [radical, nameMnemonics, pinyinMnemonics] = await Promise.all([
        lookupHanziWord(id as HanziWord),
        lookupHanziWordGlossMnemonics(id as HanziWord),
        lookupHanziWordPinyinMnemonics(id as HanziWord),
      ]);
      return { radical, nameMnemonics, pinyinMnemonics };
    },
  });

  return (
    <ScrollView className="bg-background">
      <ReferencePage
        header={
          <ReferencePageHeader
            gradientColors={GradientAqua}
            title={id}
            subtitle={query.data?.radical?.gloss[0] ?? null}
          />
        }
        body={
          query.isLoading ? (
            <Text className="text-text">Loading</Text>
          ) : query.isError ? (
            <Text className="text-text">Error</Text>
          ) : (
            <>
              {query.data?.nameMnemonics == null ? null : (
                <ReferencePageBodySection title="Name mnemonics">
                  <View className="flex-col gap-2">
                    {query.data.nameMnemonics.map(
                      ({ mnemonic, rationale }, i) => (
                        <View key={i} className="gap-1">
                          <Text className="text-text">{mnemonic}</Text>
                          <Text className="text-xs italic text-primary-10">
                            {rationale}
                          </Text>
                        </View>
                      ),
                    )}
                  </View>
                </ReferencePageBodySection>
              )}
              {query.data?.pinyinMnemonics == null ? null : (
                <ReferencePageBodySection title="Pinyin mnemonics">
                  <View className="flex-col gap-2">
                    {query.data.pinyinMnemonics.map(
                      ({ mnemonic, strategy: rationale }, i) => (
                        <View key={i} className="gap-1">
                          <Text className="text-text">{mnemonic}</Text>
                          <Text className="text-xs italic text-primary-10">
                            {rationale}
                          </Text>
                        </View>
                      ),
                    )}
                  </View>
                </ReferencePageBodySection>
              )}
              {query.data?.radical == null ? null : (
                <ReferencePageBodySection title="Meaning">
                  {query.data.radical.gloss.join(`, `)}
                </ReferencePageBodySection>
              )}
              {query.data?.radical?.pinyin == null ? null : (
                <ReferencePageBodySection title="Pinyin">
                  {query.data.radical.pinyin.join(`, `)}
                </ReferencePageBodySection>
              )}
            </>
          )
        }
      />
    </ScrollView>
  );
}
