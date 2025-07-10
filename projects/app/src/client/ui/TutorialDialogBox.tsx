import { IconImage } from "@/client/ui/IconImage";
import { SpeechBubble } from "@/client/ui/SpeechBubble";
import { useState } from "react";
import { Pressable, Text } from "react-native";
import Reanimated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { HhhmarkTypewriter } from "./HhhmarkTypewriter";

export const TutorialDialogBox = ({
  text,
  onContinue,
}: {
  text: string;
  onContinue: () => void;
}) => {
  const [speechBubbleLoaded, setSpeechBubbleLoaded] = useState(false);
  const [textAnimationDone, setTextAnimationDone] = useState(false);

  // Entering animation timeline (0 to 1). This faciliates delaying the entering
  // animation until the assets have been loaded.
  const enteringTimelineSv = useSharedValue(0);

  const animatedContentStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: interpolate(enteringTimelineSv.get(), [0, 1], [-10, 0]) },
      ],
      opacity: enteringTimelineSv.get(),
    };
  });

  return (
    <Reanimated.View style={[animatedContentStyle]} className="p-4 pl-8">
      {speechBubbleLoaded ? (
        <HhhmarkTypewriter
          source={text}
          className="hhh-body"
          delay={500}
          onAnimateEnd={() => {
            setTextAnimationDone(true);
          }}
        />
      ) : null}
      <Pressable
        className={`
          -mb-2 -mr-2 mt-1 flex-row items-center justify-end gap-1 transition-opacity duration-300

          ${textAnimationDone ? `opacity-100` : `pointer-events-none opacity-0`}
        `}
        onPress={() => {
          onContinue();
        }}
      >
        <Text className="hhh-button-bare text-fg">Continue</Text>
        <IconImage
          source={require(`@/assets/icons/chevron-forward-filled.svg`)}
          size={24}
          className="animate-hoscillate"
        />
      </Pressable>
      <SpeechBubble
        className="pointer-events-none absolute inset-0"
        onLoad={() => {
          enteringTimelineSv.value = withTiming(1, {
            easing: Easing.out(Easing.cubic),
            duration: 250,
          });
          setSpeechBubbleLoaded(true);
        }}
      />
    </Reanimated.View>
  );
};
