import { useState } from "react";
import { View } from "react-native";
import Reanimated, { FadeIn, FadeOut } from "react-native-reanimated";
import { Delay } from "./Delay";
import { ImageCloud } from "./ImageCloud";
import { NewSprout } from "./NewSprout";
import { TutorHead } from "./TutorHead";
import { TutorialDialogBox } from "./TutorialDialogBox";

export function NewWordTutorial({
  className,
  initialStep = `splash`,
}: {
  className?: string;
  initialStep?: `splash` | `deps` | `end`;
}) {
  const [step, setStep] = useState(initialStep);

  return (
    <View className={className}>
      {step === `splash` ? (
        <Reanimated.View
          entering={FadeIn.delay(600)}
          exiting={FadeOut}
          className="size-full items-center justify-center"
        >
          <NewSprout className="size-[200px]" />
        </Reanimated.View>
      ) : step === `deps` ? (
        <Delay ms={800} key={step}>
          <Reanimated.View
            entering={FadeIn.delay(200)}
            className="size-full items-center justify-center px-10"
          >
            <ImageCloud className="aspect-square w-full" />
          </Reanimated.View>
        </Delay>
      ) : null}

      <Delay ms={1500}>
        <View className="absolute inset-x-3 bottom-3">
          <View className="flex-row items-end justify-start gap-1 p-2 pr-6">
            <Delay ms={0}>
              <TutorHead exit={step === `end`} />
            </Delay>
            {step === `splash` ? (
              <Delay ms={800} key={step}>
                <View className="flex-1 pb-10">
                  <TutorialDialogBox
                    onContinue={() => {
                      setStep(`deps`);
                    }}
                    text="…you know ==辶== means **walk or movement**, and ==力== means **strength**…"
                  />
                </View>
              </Delay>
            ) : step === `deps` ? (
              <Delay ms={500} key={step}>
                <View className="flex-1 pb-10">
                  <TutorialDialogBox
                    onContinue={() => {
                      setStep(`end`);
                    }}
                    text="…you need **strength** when you **walk** close to an ==edge==…"
                  />
                </View>
              </Delay>
            ) : null}
          </View>
        </View>
      </Delay>
    </View>
  );
}
