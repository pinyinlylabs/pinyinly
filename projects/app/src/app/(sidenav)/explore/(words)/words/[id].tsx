import { useLocalQuery } from "@/client/hooks/useLocalQuery";
import { ReferencePage } from "@/client/ui/ReferencePage";
import { ReferencePageBodySection } from "@/client/ui/ReferencePageBodySection";
import { ReferencePageHeader } from "@/client/ui/ReferencePageHeader";
import { GradientPurple } from "@/client/ui/styles";
import type { HanziText } from "@/data/model";
import { lookupHanzi } from "@/dictionary/dictionary";
import { useLocalSearchParams } from "expo-router";
import { ScrollView } from "react-native";

export default function WordPage() {
  const { id } = useLocalSearchParams<`/explore/words/[id]`>();

  const query = useLocalQuery({
    queryKey: [`word`, id],
    queryFn: async () => {
      const [result] = await lookupHanzi(id as HanziText);
      if (result != null) {
        const [hanziWord, meaning] = result;
        return {
          hanziWord,
          meaning,
        };
      }
      return null;
    },
  });

  return (
    <ScrollView>
      <ReferencePage
        header={
          <ReferencePageHeader
            gradientColors={GradientPurple}
            title={id}
            subtitle={query.data?.meaning.definition ?? null}
          />
        }
        body={
          query.isLoading ? (
            <>Loading</>
          ) : query.isError ? (
            <>Error</>
          ) : (
            <>
              <ReferencePageBodySection title="Mnemonic">
                {`todo`}
              </ReferencePageBodySection>

              <ReferencePageBodySection title="Meaning">
                {query.data?.meaning.definition}
              </ReferencePageBodySection>

              {query.data?.meaning.pinyin === undefined ? null : (
                <ReferencePageBodySection title="Pronunciation">
                  {query.data.meaning.pinyin}
                </ReferencePageBodySection>
              )}

              <ReferencePageBodySection title="Characters">
                {[].join(`, `)}
              </ReferencePageBodySection>
            </>
          )
        }
      />
    </ScrollView>
  );
}
