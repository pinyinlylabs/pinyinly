import { Text, View } from "react-native";

export function CustomComponent() {
  return <Text>Hello from CustomComponent</Text>;
}

export function CustomWrapper({ children }: { children: React.ReactNode }) {
  return (
    <View>
      <Text>Custom Wrapper: {children}</Text>
    </View>
  );
}
