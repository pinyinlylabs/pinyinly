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
        <Text className="text-lg text-primary-10">{title}</Text>
      </View>
      <View>
        {typeof children === `string` ? (
          <Text className="text-xl text-primary-12">{children}</Text>
        ) : (
          children
        )}
      </View>
    </View>
  );
};
