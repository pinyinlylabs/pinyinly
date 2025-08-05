import type { PropsOf } from "@pinyinly/lib/types";
import type { Ref } from "react";
import { TextInput } from "react-native";
import { tv } from "tailwind-variants";

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
      className={inputClass({
        textAlign: props.textAlign,
      })}
    />
  );
}

const inputClass = tv({
  base: `
    pyly-body-input rounded-xl bg-bg-loud px-4 py-3 outline-none

    placeholder:text-fg/30
  `,
  variants: {
    textAlign: {
      left: `text-left`,
      center: `text-center`,
      right: `text-right`,
    },
  },
});
