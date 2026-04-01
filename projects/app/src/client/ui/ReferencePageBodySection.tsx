import { Text, View } from "react-native";

export const ReferencePageBodySection = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => {
  return (
    <View className="gap-[4px]">
      <View>
        <Text className="font-sans text-lg text-fg-dim">{title}</Text>
      </View>
      <View>
        {typeof children === `string` ? (
          <Text className="font-sans text-xl text-fg">{children}</Text>
        ) : (
          children
        )}
      </View>
    </View>
  );
};
