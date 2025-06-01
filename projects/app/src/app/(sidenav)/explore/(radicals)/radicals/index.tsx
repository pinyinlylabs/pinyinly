import { useLocalQuery } from "@/client/hooks/useLocalQuery";
import { RectButton2 } from "@/client/ui/RectButton2";
import { radicalStrokes } from "@/data/hanzi";
import { allRadicalsByStrokes } from "@/dictionary/dictionary";
import { Link } from "expo-router";
import { ScrollView, Text, View } from "react-native";

export default function RadicalsPage() {
  const query = useLocalQuery({
    queryKey: [RadicalsPage.name, `radicals`],
    queryFn: () => allRadicalsByStrokes(),
  });

  return (
    <ScrollView contentContainerClassName="py-safe-offset-4 px-safe-or-4 items-center">
      <View className="max-w-[600px] gap-4">
        <View className="gap-2 px-safe-or-4 lg:px-0">
          <Text className="text-center text-2xl font-bold text-foreground">
            Kangxi Radicals
          </Text>
          <Text className="text-center text-foreground">
            The building blocks of Chinese characters, representing core
            meanings and structures. Familiarizing yourself with these radicals
            will help you recognize patterns, understand character meanings, and
            build a solid foundation for learning Chinese.
          </Text>
        </View>

        {query.data == null ? (
          query.isLoading ? (
            <Text className="text-foreground">Loading</Text>
          ) : query.isError ? (
            <Text className="text-foreground">Error</Text>
          ) : (
            <Text className="text-foreground">unexpected state</Text>
          )
        ) : (
          radicalStrokes.map((strokes) => (
            <View
              key={strokes}
              className="gap-2 border-t-2 border-primary-7 pt-2 px-safe-or-4 lg:px-0"
            >
              <Text className="text-sm text-primary-10">
                Radicals with {strokes} strokes
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {query.data.get(strokes)?.characters.map((char, i) => (
                  <Link
                    href={
                      strokes > 1
                        ? `/explore/radicals/new/${char}`
                        : `/explore/radicals/${char}`
                    }
                    asChild
                    key={i}
                  >
                    <RectButton2 textClassName="text-xl font-normal">
                      {char}
                    </RectButton2>
                  </Link>
                ))}
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
