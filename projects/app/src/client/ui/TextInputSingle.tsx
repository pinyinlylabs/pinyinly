import type { Ref } from "react";
import { TextInput } from "react-native";
import type { PropsOf } from "./types";

interface TextInputSingleProps
  extends Omit<
    PropsOf<typeof TextInput>,
    // make `placeholder` mandatory (encourage a11y)
    `placeholder`
  > {
  disabled?: boolean;
  placeholder: string | undefined;
  ref?: Ref<TextInput>;
}

export function TextInputSingle(props: TextInputSingleProps) {
  return (
    <TextInput
      {...props}
      // @ts-expect-error `dataSet` isn't a standard prop in react-native, but it exists for react-native-web
      // since https://github.com/necolas/react-native-web/releases/tag/0.13.0
      dataSet={{
        // Disable the 1Password button in inputs.
        "1p-ignore": `true`,
      }}
      className="hhh-text-body-input rounded-xl bg-background-1 px-4 py-3 outline-none placeholder:text-foreground/30"
    />
  );
}
