import type {
  Mistake,
  MultipleChoiceQuestion,
  NewSkillRating,
} from "@/data/model";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import chunk from "lodash/chunk";
import type { ElementRef } from "react";
import { forwardRef, memo, useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";
import { RectButton } from "./RectButton";
import type { PropsOf } from "./types";

const buttonThickness = 4;
const gap = 16;

export const QuizDeckMultipleChoiceQuestion = memo(
  function QuizDeckMultipleChoiceQuestion({
    question,
    onNext,
  }: {
    question: MultipleChoiceQuestion;
    onNext: () => void;
    onRating: (ratings: NewSkillRating[], mistakes: Mistake[]) => void;
  }) {
    const { prompt, choices } = question;
    const [selectedChoice, setSelectedChoice] = useState<string>();

    useEffect(() => {
      setAudioModeAsync({ playsInSilentMode: true }).catch((error: unknown) => {
        console.error(`Error setting audio mode`, error);
      });
    }, []);

    const player = useAudioPlayer(
      `https://static-ruddy.vercel.app/speech/1/2-1d2454055c29d34e69979f8873769672.aac`,
    );

    useEffect(() => {
      player.play();
    }, [player]);

    const choicesRows = chunk(choices, 2);
    const handleSubmit = () => {
      throw new Error(`not implemented`);
      // TODO: show error or success modal
      // onRating(
      //   question,
      //   selectedChoice === answer ? Rating.Good : Rating.Again,
      // );
      onNext();
    };
    return (
      <View
        style={{
          flex: 1,
          gap: gap + buttonThickness,
        }}
      >
        <View>
          <Text
            style={{
              color: `white`,
              fontSize: 24,
              fontWeight: `bold`,
            }}
          >
            {prompt}
          </Text>
        </View>
        {choicesRows.map((choicesRow, i) => (
          <View className="flex-1 flex-row items-stretch gap-[16px]" key={i}>
            {choicesRow.map((choice, i) => (
              <AnswerButton
                text={choice}
                selected={choice === selectedChoice}
                onPress={setSelectedChoice}
                key={i}
              />
            ))}
          </View>
        ))}
        <SubmitButton
          disabled={selectedChoice === undefined}
          onPress={handleSubmit}
        />
      </View>
    );
  },
);

const SubmitButton = forwardRef<
  ElementRef<typeof RectButton>,
  { disabled: boolean } & Pick<PropsOf<typeof RectButton>, `onPress`>
>(function SubmitButton({ disabled, ...rectButtonProps }, ref) {
  const color = disabled ? `#3A464E` : `#A1D151`;
  const textColor = disabled ? `#56646C` : `#161F23`;

  return (
    <RectButton
      color={color}
      thickness={disabled ? 0 : undefined}
      ref={ref}
      {...(disabled ? null : rectButtonProps)}
    >
      <Text
        className="select-none"
        style={{
          textTransform: `uppercase`,
          color: textColor,
          fontSize: 16,
          fontWeight: `bold`,
          paddingBottom: 4,
          paddingTop: 4,
        }}
      >
        Check
      </Text>
    </RectButton>
  );
});

const AnswerButton = ({
  selected,
  text,
  onPress,
}: {
  selected: boolean;
  text: string;
  onPress: (text: string) => void;
}) => {
  const handlePress = useCallback(() => {
    onPress(text);
  }, [onPress, text]);

  const color = selected ? `#232E35` : `#161F23`;
  const accentColor = selected ? `#5183A4` : `#3A464E`;

  return (
    <RectButton
      borderWidth={2}
      thickness={buttonThickness}
      color={color}
      accentColor={accentColor}
      onPress={handlePress}
      style={{ flex: 1 }}
    >
      <View style={{ justifyContent: `center` }}>
        <Text className="select-none" style={{ color: `white`, fontSize: 80 }}>
          {text}
        </Text>
      </View>
    </RectButton>
  );
};
