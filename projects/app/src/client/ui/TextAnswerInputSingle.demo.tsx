import { View } from "react-native";
import { ExampleStack, LittlePrimaryHeader } from "./demo/helpers";
import { TextAnswerInputSingle } from "./TextAnswerInputSingle";

export default () => {
  return (
    <View className="flex-1 gap-4 p-4">
      <LittlePrimaryHeader title="TextAnswerInputSingle" />

      <View className="flex-row flex-wrap gap-4">
        <ExampleStack title="Default">
          <TextAnswerInputSingle
            placeholder="Type your answer"
            onChangeValue={(value) => {
              console.log(`onChangeValue`, value);
            }}
            onSubmit={() => {
              console.log(`onSubmit`);
            }}
          />
        </ExampleStack>

        <ExampleStack title="Success">
          <TextAnswerInputSingle
            initialValue="hello"
            placeholder="Type your answer"
            state="success"
            onChangeValue={(value) => {
              console.log(`onChangeValue`, value);
            }}
            onSubmit={() => {
              console.log(`onSubmit`);
            }}
          />
        </ExampleStack>

        <ExampleStack title="Error">
          <TextAnswerInputSingle
            initialValue="helo"
            placeholder="Type your answer"
            state="error"
            onChangeValue={(value) => {
              console.log(`onChangeValue`, value);
            }}
            onSubmit={() => {
              console.log(`onSubmit`);
            }}
          />
        </ExampleStack>

        <ExampleStack title="Warning">
          <TextAnswerInputSingle
            initialValue="hello"
            placeholder="Type your answer"
            state="warning"
            onChangeValue={(value) => {
              console.log(`onChangeValue`, value);
            }}
            onSubmit={() => {
              console.log(`onSubmit`);
            }}
          />
        </ExampleStack>

        <ExampleStack title="With hint">
          <TextAnswerInputSingle
            placeholder="Type your answer"
            hintText="This is a helpful hint."
            onChangeValue={(value) => {
              console.log(`onChangeValue`, value);
            }}
            onSubmit={() => {
              console.log(`onSubmit`);
            }}
          />
        </ExampleStack>

        <ExampleStack title="Disabled">
          <TextAnswerInputSingle
            initialValue="can't edit this"
            placeholder="Type your answer"
            disabled
            onChangeValue={(value) => {
              console.log(`onChangeValue`, value);
            }}
            onSubmit={() => {
              console.log(`onSubmit`);
            }}
          />
        </ExampleStack>

        <ExampleStack title="With auto-correct (English)">
          <TextAnswerInputSingle
            placeholder="Type in English"
            autoCorrect
            onChangeValue={(value) => {
              console.log(`onChangeValue`, value);
            }}
            onSubmit={() => {
              console.log(`onSubmit`);
            }}
          />
        </ExampleStack>
      </View>
    </View>
  );
};
