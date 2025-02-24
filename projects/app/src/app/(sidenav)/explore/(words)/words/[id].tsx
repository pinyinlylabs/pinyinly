import { ReferencePage } from "@/client/ui/ReferencePage";
import { ReferencePageBodySection } from "@/client/ui/ReferencePageBodySection";
import { ReferencePageHeader } from "@/client/ui/ReferencePageHeader";
import { GradientPurple } from "@/client/ui/styles";
import { lookupHanzi } from "@/dictionary/dictionary";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { ScrollView } from "react-native";

export default function WordPage() {
  const { id } = useLocalSearchParams<`/explore/words/[id]`>();

  const query = useQuery({
    queryKey: [`word`, id],
    queryFn: async () => {
      const [result] = await lookupHanzi(id);
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

              {query.data?.meaning.pinyin !== undefined ? (
                <ReferencePageBodySection title="Pronunciation">
                  {query.data.meaning.pinyin}
                </ReferencePageBodySection>
              ) : null}

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
