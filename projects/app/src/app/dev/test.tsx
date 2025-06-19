import { useVisualViewportSize } from "@/client/hooks/useVisualViewportSize";
import {
  QuizSubmitButton,
  QuizSubmitButtonState,
} from "@/client/ui/QuizSubmitButton";
import { RectButton } from "@/client/ui/RectButton";
import { TextInputSingle } from "@/client/ui/TextInputSingle";
import { StrictMode, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";

function TestPage() {
  const visualViewport = useVisualViewportSize();

  const [text, setText] = useState(``);

  const scrollViewRef = useRef<ScrollView>(null);
  return (
    <ScrollView
      ref={scrollViewRef}
      className="bg-[red]"
      contentContainerClassName="flex-1"
      // className={focused ? `max-h-vvh` : `max-h-[800px)]`}
    >
      <View
        className={`h-vvh max-h-vvh w-dvw flex-1 gap-5 bg-[blue] transition-[height,max-height]`}
      >
        <View className={``}>
          <RectButton
            onPress={() => {
              alert(1);
            }}
          >
            header
          </RectButton>
        </View>
        <Text className="text-[100px] text-fg">你好</Text>

        <TextInputSingle
          placeholder={`type text`}
          onChangeText={setText}
          onKeyPress={(e) => {
            if (e.nativeEvent.key === `Enter`) {
              e.preventDefault();
              alert(`Enter pressed`);
            }
          }}
          value={text}
        />
        {text.endsWith(`a`) ? (
          <RectButton
            onTouchEnd={(e) => {
              // Using `onTouchEnd` instead of `onPress` to avoid the keyboard
              // closing when the button is pressed.
              // This is a workaround for the issue where the keyboard closes when
              // pressing a button after typing in a TextInput.
              e.preventDefault();
              setText((prev) => prev + `onTouchEnd`);
            }}
          >
            chuāng
          </RectButton>
        ) : null}
        <Text
          className={`h-[100px] overflow-hidden whitespace-pre bg-[red] text-fg transition-[height]`}
        >
          {JSON.stringify({ visualViewport }, null, 2)}
        </Text>
        <View className="flex-1" />
        <View className="sticky flex-row">
          <QuizSubmitButton
            onPress={() => {
              alert(1);
            }}
            state={QuizSubmitButtonState.Check}
          />
        </View>
      </View>
    </ScrollView>
  );
}

export default function TestPageStrict() {
  return (
    <StrictMode>
      <TestPage />
    </StrictMode>
  );
}
