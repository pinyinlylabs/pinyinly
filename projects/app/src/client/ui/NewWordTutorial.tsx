import { Image } from "expo-image";
import { useState } from "react";
import { View } from "react-native";
import Reanimated, { FadeIn } from "react-native-reanimated";
import { Delay } from "./Delay";
import { NewSprout } from "./NewSprout";
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
          <Delay ms={500}>
            <Tutor />
          </Delay>
          <Delay ms={1000}>
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

function Tutor({ className }: { className?: string }) {
  return (
    <Image
      source={require(`@/assets/illustrations/tutor.svg`)}
      className={`
        h-[94px] w-[80px] animate-fadein

        ${className ?? ``}
      `}
    />
  );
}
