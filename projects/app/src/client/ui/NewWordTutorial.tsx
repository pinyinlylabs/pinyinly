import { useState } from "react";
import { View } from "react-native";
import Reanimated, { FadeIn } from "react-native-reanimated";
import { Delay } from "./Delay";
import { NewSprout } from "./NewSprout";
import { TutorHead } from "./TutorHead";
import { TutorialDialogBox } from "./TutorialDialogBox";

export function NewWordTutorial({ className }: { className?: string }) {
  const [step, setStep] = useState<`splash` | `deps`>(`splash`);

  return (
    <View className={className}>
      {step === `splash` ? (
        <Reanimated.View
          entering={FadeIn.delay(600)}
          className="size-full items-center justify-center"
        >
          <NewSprout className="size-[200px]" />
        </Reanimated.View>
      ) : null}
      <Delay ms={1500}>
        <View className="absolute bottom-3 left-3 flex-row items-end justify-start gap-1 p-2 pr-6">
          <Delay ms={0}>
            <TutorHead />
          </Delay>
          <Delay ms={1100}>
            <View className="flex-1 pb-10">
              <TutorialDialogBox
                onContinue={() => {
                  setStep(`deps`);
                }}
                text="…you know **辶** means **walk or movement**, and **力** means **strength**… "
              />
            </View>
          </Delay>
        </View>
      </Delay>
    </View>
  );
}
