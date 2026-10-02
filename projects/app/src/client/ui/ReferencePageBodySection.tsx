import { Text } from "@/client/ui/Text";
import { View } from "@/client/ui/View";

export const ReferencePageBodySection = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => {
  return (
    <View className="gap-1">
      <View>
        <Text className="font-sans text-lg text-muted-fg">{title}</Text>
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
