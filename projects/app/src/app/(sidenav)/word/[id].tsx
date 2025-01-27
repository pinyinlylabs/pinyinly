import { ReferencePage } from "@/client/ui/ReferencePage";
import { ReferencePageBodySection } from "@/client/ui/ReferencePageBodySection";
import { ReferencePageHeader } from "@/client/ui/ReferencePageHeader";
import { GradientPurple } from "@/client/ui/styles";
import { lookupWord } from "@/dictionary/dictionary";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { ScrollView } from "react-native";

export default function WordPage() {
  const { id } = useLocalSearchParams<`/word/[id]`>();

  const query = useQuery({
    queryKey: [`word`, id],
    queryFn: async () => {
      return await lookupWord(id);
    },
    throwOnError: true,
  });

  return (
    <ScrollView>
      <ReferencePage
        header={
          <ReferencePageHeader
            gradientColors={GradientPurple}
            title={id}
            subtitle={query.data?.definitions.join(`; `) ?? null}
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
                {query.data?.definitions.join(`; `) ?? ``}
              </ReferencePageBodySection>

              {query.data?.pinyin !== undefined ? (
                <ReferencePageBodySection title="Pronunciation">
                  {query.data.pinyin}
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
