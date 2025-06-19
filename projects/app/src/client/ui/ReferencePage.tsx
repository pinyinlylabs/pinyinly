import type { ReactElement, ReactNode } from "react";
import { View } from "react-native";

export const ReferencePage = ({
  header,
  body,
}: {
  header: ReactElement;
  body: ReactNode;
}) => {
  return (
    <View className="flex-1 bg-bg">
      <View
        className={`
          w-full max-w-[600px] self-center overflow-hidden

          lg:my-4 lg:rounded-t-lg
        `}
      >
        {header}

        <View className="gap-[12px] p-[12px] pt-quiz-px">{body}</View>
      </View>
    </View>
  );
};
