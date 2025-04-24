import { useLocalQuery } from "@/client/hooks/useLocalQuery";
import { ReferencePage } from "@/client/ui/ReferencePage";
import { ReferencePageBodySection } from "@/client/ui/ReferencePageBodySection";
import { ReferencePageHeader } from "@/client/ui/ReferencePageHeader";
import { GradientRed } from "@/client/ui/styles";
import { useLocalSearchParams } from "expo-router";

export default function CharacterPage() {
  const { id } = useLocalSearchParams<`/character/[id]`>();

  const query = useLocalQuery({
    queryKey: [`character`, id],
    // eslint-disable-next-line @typescript-eslint/require-await
    queryFn: async () => {
      return null;
    },
  });

  return (
    <ReferencePage
      header={
        <ReferencePageHeader
          gradientColors={GradientRed}
          title={id}
          subtitle={`todo`}
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
              {`todo`}
            </ReferencePageBodySection>

            <ReferencePageBodySection title="Pronunciation">
              {`todo`}
            </ReferencePageBodySection>

            <ReferencePageBodySection title="Radicals">
              {`todo`}
            </ReferencePageBodySection>
          </>
        )
      }
    />
  );
}
