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

export function Separator({ title }: { title?: string }) {
  return (
    <View className="w-full bg-fg/10 px-2 py-1">
      {title == null ? null : <Text className="pyly-dev-dt">{title}</Text>}
    </View>
  );
}
