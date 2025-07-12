import { Link, useLocalSearchParams } from "expo-router";
import { StrictMode } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { demos } from ".";
import { examplesStackClassName, Section } from "./_helpers";

const NotFound = () => {
  return (
    <View className="flex-1 items-center justify-center">
      <Text className="text-2xl text-fg">Not found</Text>
      <Text className="text-lg text-fg/50">This demo does not exist.</Text>
    </View>
  );
};

function UiDemoPage() {
  const id = useLocalSearchParams<`/dev/ui/[id]`>().id;
  const insets = useSafeAreaInsets();

  const Demo = demos[id] ?? NotFound;

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <View className="flex-row p-2">
        <Link href="/dev/ui" asChild>
          <Text
            className={`
              text-fg

              hover:underline
            `}
          >
            Back
          </Text>
        </Link>
      </View>
      <ScrollView className="flex-1" contentContainerClassName="flex-1">
        <Section title={id} href={`/dev/ui/${id}`}>
          <Demo />
        </Section>

        {/* Fill the rest of the page if it's too tall for the content */}
        <View className="flex-1 flex-row">
          <View
            className={`
              hhh-color-schema-light theme-default

              ${examplesStackClassName}
            `}
          />
          <View
            className={`
              hhh-color-scheme-dark theme-default

              ${examplesStackClassName}
            `}
          />
        </View>
      </ScrollView>
    </View>
  );
}

export default function DesignSystemStrict() {
  return (
    <StrictMode>
      <UiDemoPage />
    </StrictMode>
  );
}
