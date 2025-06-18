import { useHanziMeanings } from "@/client/hooks/useHanziMeanings";
import { useHanziWikiEntry } from "@/client/hooks/useHanziWikiEntry";
import type { HanziText } from "@/data/model";
import { Fragment } from "react";
import { Text, View } from "react-native";
import { HanziWordRefText } from "./HanziWordRefText";
import { Hhhmark } from "./Hhhmark";

export const WikiHanziInterpretationPanel = ({
  hanzi,
}: {
  hanzi: HanziText;
}) => {
  const wikiEntry = useHanziWikiEntry(hanzi);
  const meanings = useHanziMeanings(hanzi);

  return wikiEntry.data?.components == null ? null : (
    <View className="gap-1">
      <Text className="font-karla text-xs uppercase text-caption">
        Interpretation
      </Text>
      <View className="gap-4 rounded-xl bg-primary-5 p-4">
        {wikiEntry.data.components.map((component, i) => {
          return (
            <View key={i} className="gap-1">
              <Text className="hhh-body">
                {component.title ??
                  (component.hanziWord == null ? null : (
                    <HanziWordRefText
                      hanziWord={component.hanziWord}
                      context="body"
                    />
                  )) ??
                  `???`}
              </Text>
              <Text className="hhh-body-caption">{component.description}</Text>
            </View>
          );
        })}

        {meanings.data == null
          ? null
          : meanings.data.map(([, meaning], i) =>
              meaning.glossHint == null ? null : (
                <Fragment key={i}>
                  <View className="h-px w-full bg-primary-8" />
                  <Text className="hhh-body">
                    <Hhhmark source={meaning.glossHint} context="body" />
                  </Text>
                </Fragment>
              ),
            )}

        {wikiEntry.data.interpretation == null ? null : (
          <>
            <View className="h-px w-full bg-primary-8" />
            <Text className="hhh-body">
              <Hhhmark source={wikiEntry.data.interpretation} context="body" />
            </Text>
          </>
        )}
      </View>
    </View>
  );
};
