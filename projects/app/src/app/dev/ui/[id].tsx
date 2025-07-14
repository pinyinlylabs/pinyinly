import { useLocalSearchParams } from "expo-router";
import { StrictMode } from "react";
import { Text, View } from "react-native";
import { demos } from ".";
import { Section } from "./_helpers";

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
  const Demo = demos[id] ?? NotFound;

  return (
    <Section title={id} href={`/dev/ui/${id}`}>
      <Demo />
    </Section>
  );
}

export default function DesignSystemStrict() {
  return (
    <StrictMode>
      <UiDemoPage />
    </StrictMode>
  );
}
