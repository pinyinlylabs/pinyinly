import { NewWordTutorial } from "@/client/ui/NewWordTutorial";
import { RectButton } from "@/client/ui/RectButton";
import type { PropsOf } from "@/client/ui/types";
import { useState } from "react";
import { View } from "react-native";

export default () => {
  const [rerenderCount, setRerenderCount] = useState(0);
  const [initialStep, setInitialStep] =
    useState<PropsOf<typeof NewWordTutorial>[`initialStep`]>();

  return (
    <View className="flex-1 items-center justify-center gap-4">
      <NewWordTutorial
        className="h-[800px] w-[420px] rounded-xl border border-fg/20"
        key={`${rerenderCount}-${initialStep ?? ``}`}
        initialStep={initialStep}
      />
      <View className="flex-row gap-2">
        {([`splash`, `deps`] as const).map((step) => (
          <RectButton
            variant="bare"
            key={step}
            onPress={() => {
              setInitialStep(step);
            }}
          >
            {step}
          </RectButton>
        ))}

        <RectButton
          variant="bare"
          onPress={() => {
            setRerenderCount((prev) => prev + 1);
          }}
        >
          Restart
        </RectButton>
      </View>
    </View>
  );
};
