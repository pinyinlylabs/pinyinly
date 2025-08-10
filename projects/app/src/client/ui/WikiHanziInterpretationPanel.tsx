import { hanziWikiEntryQuery } from "@/client/query";
import type { HanziText } from "@/data/model";
import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";
import { HanziWordRefText } from "./HanziWordRefText";
import { Pylymark } from "./Pylymark";

export const WikiHanziInterpretationPanel = ({
  hanzi,
}: {
  hanzi: HanziText;
}) => {
  const wikiEntry = useQuery(hanziWikiEntryQuery(hanzi));

  return wikiEntry.data?.components == null ? null : (
    <View className="gap-1">
      <Text className="font-karla text-xs uppercase text-caption">
        Interpretation
      </Text>
      <View className="gap-4 rounded-xl bg-bg-loud p-4">
        {wikiEntry.data.components.map((component, i) => {
          return (
            <View key={i} className="gap-1">
              <Text className="pyly-body">
                {component.title ??
                  (component.hanziWord == null ? null : (
                    <HanziWordRefText hanziWord={component.hanziWord} />
                  )) ??
                  `???`}
              </Text>
              <Text className="pyly-body-caption">{component.description}</Text>
            </View>
          );
        })}

        {wikiEntry.data.interpretation == null ? null : (
          <>
            <View className="h-px w-full bg-bg-loud" />
            <Text className="pyly-body">
              <Pylymark source={wikiEntry.data.interpretation} />
            </Text>
          </>
        )}
      </View>
    </View>
  );
};
