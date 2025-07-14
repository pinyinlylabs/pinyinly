import { IconImage } from "@/client/ui/IconImage";
import { SpeechBubble } from "@/client/ui/SpeechBubble";
import { useState } from "react";
import { Text } from "react-native";
import {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { PylymarkTypewriter } from "./PylymarkTypewriter";
import { ReanimatedPressable } from "./ReanimatedPressable";

export const TutorialDialogBox = ({
  text,
  onContinue,
}: {
  text: string;
  onContinue: () => void;
}) => {
  const [speechBubbleLoaded, setSpeechBubbleLoaded] = useState(false);
  const [typewriterCompleted, setTypewriterCompleted] = useState(false);
  const [fastForward, setFastForward] = useState(false);

  // Entering animation timeline (0 to 1). This faciliates delaying the entering
  // animation until the assets have been loaded.
  const enteringTimelineSv = useSharedValue(0);

  const animatedContentStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: interpolate(enteringTimelineSv.get(), [0, 1], [-20, 0]) },
      ],
    };
  });

  const handlePress = () => {
    if (typewriterCompleted) {
      onContinue();
    } else {
      setFastForward(true);
      setTypewriterCompleted(true);
    }
  };

  return (
    <ReanimatedPressable
      style={[animatedContentStyle]}
      className="py-[14px] pl-[32px] pr-[18px]"
      onPress={handlePress}
    >
      <Text className={`pyly-body relative`}>
        {speechBubbleLoaded ? (
          <PylymarkTypewriter
            source={text}
            fastForward={fastForward}
            delay={500}
            onAnimateEnd={() => {
              setTypewriterCompleted(true);
            }}
          />
        ) : null}
        {/* Reserve some space for the "Next" chevron icon, so that it doesn't overlap the content of the text. */}
        <Text className="inline-block w-[24px]"></Text>

        <IconImage
          source={require(`@/assets/icons/chevron-forward-filled.svg`)}
          size={24}
          className={`
            absolute bottom-0 right-[-6px] animate-hoscillate text-fg-bold transition-opacity
            duration-300

            ${typewriterCompleted ? `opacity-100` : `pointer-events-none opacity-0`}
          `}
        />
      </Text>

      <SpeechBubble
        className="absolute inset-0"
        onLoad={() => {
          enteringTimelineSv.value = withTiming(1, {
            easing: Easing.out(Easing.cubic),
            duration: 500,
          });
          setSpeechBubbleLoaded(true);
        }}
      />
    </ReanimatedPressable>
  );
};
