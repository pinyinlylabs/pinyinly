import { useLocalQuery } from "@/client/hooks/useLocalQuery";
import { RectButton2 } from "@/client/ui/RectButton2";
import {
  allHsk1HanziWords,
  allHsk2HanziWords,
  allHsk3HanziWords,
  hanziFromHanziWord,
} from "@/dictionary/dictionary";
import { Link } from "expo-router";
import { ScrollView, Text, View } from "react-native";

export default function WordsPage() {
  const query = useLocalQuery({
    queryKey: [WordsPage.name, `words`],
    queryFn: async () => {
      const [hsk1Words, hsk2Words, hsk3Words] = await Promise.all([
        allHsk1HanziWords().then((x) => x.map((y) => hanziFromHanziWord(y))),
        allHsk2HanziWords().then((x) => x.map((y) => hanziFromHanziWord(y))),
        allHsk3HanziWords().then((x) => x.map((y) => hanziFromHanziWord(y))),
      ]);
      return { hsk1Words, hsk2Words, hsk3Words };
    },
  });

  return (
    <ScrollView
      className="bg-background"
      contentContainerClassName="py-safe-offset-4 px-safe-or-4 items-center"
    >
      <View className="max-w-[600px] gap-4">
        <View className="gap-2 px-safe-or-4 lg:px-0">
          <Text className="text-body text-center text-2xl font-bold">
            HSK 1
          </Text>
          <Text className="text-body text-center leading-relaxed">
            HSK 1 vocabulary consists of essential Chinese words that form the
            foundation for beginner-level communication. Mastering these words
            will help you build confidence in basic conversation, comprehension,
            and daily language use.
          </Text>
        </View>
        {query.data == null ? (
          query.isLoading ? (
            <Text className="text-body">Loading</Text>
          ) : query.isError ? (
            <Text className="text-body">Error</Text>
          ) : (
            <Text className="text-body">unexpected state</Text>
          )
        ) : (
          <>
            <WordList words={query.data.hsk1Words} />

            <View className="gap-2 px-safe-or-4 lg:px-0">
              <Text className="text-body text-center text-2xl font-bold">
                HSK 2
              </Text>
              <Text className="text-body text-center leading-relaxed">
                HSK 2 vocabulary expands on foundational words, adding more
                verbs, adjectives, and expressions to help you engage in simple
                conversations and express a wider range of everyday ideas in
                Chinese.
              </Text>
            </View>
            <WordList words={query.data.hsk2Words} />

            <View className="gap-2 px-safe-or-4 lg:px-0">
              <Text className="text-body text-center text-2xl font-bold">
                HSK 3
              </Text>
              <Text className="text-body text-center leading-relaxed">
                HSK 3 vocabulary expands your ability to engage in everyday
                topics and express yourself in more detail. Learning these words
                will enhance your fluency, enabling you to discuss a wider range
                of subjects and handle daily interactions with greater
                confidence.
              </Text>
            </View>
            <WordList words={query.data.hsk3Words} />
          </>
        )}
      </View>
    </ScrollView>
  );
}

const WordList = ({ words }: { words: readonly string[] }) => {
  return (
    <View className="flex-row flex-wrap gap-2">
      {words.map((word, i) => (
        <Link href={`/explore/words/${word}`} asChild key={i}>
          <RectButton2 textClassName="text-xl font-normal">{word}</RectButton2>
        </Link>
      ))}
    </View>
  );
};
