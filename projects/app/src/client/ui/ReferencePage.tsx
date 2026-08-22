import type { ReactElement, ReactNode } from "react";
import { View } from "@/client/ui/View";

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
          w-full max-w-150 self-center overflow-hidden

          lg:my-4 lg:rounded-t-lg
        `}
      >
        {header}

        <View className="gap-3 p-3 pt-4">{body}</View>
      </View>
    </View>
  );
};
