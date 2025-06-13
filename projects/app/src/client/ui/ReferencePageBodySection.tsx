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
        <Text className="text-lg text-caption">{title}</Text>
      </View>
      <View>
        {typeof children === `string` ? (
          <Text className="text-xl text-foreground">{children}</Text>
        ) : (
          children
        )}
      </View>
    </View>
  );
};
