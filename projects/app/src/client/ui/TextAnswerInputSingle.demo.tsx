import { ExampleStack, LittlePrimaryHeader } from "@/client/ui/demo/components";
import { View } from "react-native";
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

        <ExampleStack title="Disabled + Success">
          <TextAnswerInputSingle
            initialValue="hello"
            placeholder="Type your answer"
            state="success"
            disabled
            onChangeValue={(value) => {
              console.log(`onChangeValue`, value);
            }}
            onSubmit={() => {
              console.log(`onSubmit`);
            }}
          />
        </ExampleStack>

        <ExampleStack title="Disabled + Error">
          <TextAnswerInputSingle
            initialValue="helo"
            placeholder="Type your answer"
            state="error"
            disabled
            onChangeValue={(value) => {
              console.log(`onChangeValue`, value);
            }}
            onSubmit={() => {
              console.log(`onSubmit`);
            }}
          />
        </ExampleStack>

        <ExampleStack title="Disabled + Warning">
          <TextAnswerInputSingle
            initialValue="hello"
            placeholder="Type your answer"
            state="warning"
            disabled
            onChangeValue={(value) => {
              console.log(`onChangeValue`, value);
            }}
            onSubmit={() => {
              console.log(`onSubmit`);
            }}
          />
        </ExampleStack>

        <ExampleStack title="Not editable">
          <TextAnswerInputSingle
            initialValue="can't edit this"
            placeholder="Type your answer"
            editable={false}
            onChangeValue={(value) => {
              console.log(`onChangeValue`, value);
            }}
            onSubmit={() => {
              console.log(`onSubmit`);
            }}
          />
        </ExampleStack>

        <ExampleStack title="Not editable + Success">
          <TextAnswerInputSingle
            initialValue="hello"
            placeholder="Type your answer"
            state="success"
            editable={false}
            onChangeValue={(value) => {
              console.log(`onChangeValue`, value);
            }}
            onSubmit={() => {
              console.log(`onSubmit`);
            }}
          />
        </ExampleStack>

        <ExampleStack title="Not editable + Error">
          <TextAnswerInputSingle
            initialValue="helo"
            placeholder="Type your answer"
            state="error"
            editable={false}
            onChangeValue={(value) => {
              console.log(`onChangeValue`, value);
            }}
            onSubmit={() => {
              console.log(`onSubmit`);
            }}
          />
        </ExampleStack>

        <ExampleStack title="Not editable + Warning">
          <TextAnswerInputSingle
            initialValue="hello"
            placeholder="Type your answer"
            state="warning"
            editable={false}
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
