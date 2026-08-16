import { mergeRefs } from "@/client/react";
import type { PropsOf } from "@pinyinly/lib/types";
import type { Ref } from "react";
import { TextInput } from "react-native";
import { tv } from "tailwind-variants";
import { useAutoFocusRef } from "./hooks/useAutoFocusRef";

export type TextInputVariant = `bare` | `flat`;

interface TextInputSingleProps extends Omit<
  PropsOf<typeof TextInput>,
  // make `placeholder` mandatory (encourage a11y)
  | `placeholder`
  // exclude multiline props since this is a single-line input
  | `multiline`
  | `numberOfLines`
  // excluded so the JSDoc can be redefined
  | `autoFocus`
> {
  /**
   * Controls whether the input can be edited.
   * If undefined, it is derived from `disabled`.
   */
  editable?: boolean;
  disabled?: boolean;
  placeholder: string | undefined;
  ref?: Ref<TextInput>;
  variant?: TextInputVariant;
  /**
   * @warning this does not work on mobile Safari, inputs must be focused
   * manually by the user.
   */
  autoFocus?: boolean | undefined;
}

export function TextInputSingle({
  variant = `flat`,
  disabled = false,
  editable,
  ...props
}: TextInputSingleProps) {
  const autoFocusRef = useAutoFocusRef(props.autoFocus);
  const ref = mergeRefs(props.ref, autoFocusRef);
  const isEditable = editable ?? !disabled;

  return (
    <TextInput
      {...props}
      ref={ref}
      editable={isEditable}
      // @ts-expect-error `dataSet` isn't a standard prop in react-native, but it exists for react-native-web
      // since https://github.com/necolas/react-native-web/releases/tag/0.13.0
      dataSet={{
        // Disable the 1Password button in inputs.
        "1p-ignore": `true`,
      }}
      className={inputClass({
        textAlign: props.textAlign,
        disabled,
        className: props.className,
        variant,
      })}
      placeholderTextColorClassName={inputPlaceholderTextColorClass({
        variant,
      })}
    />
  );
}

const inputPlaceholderTextColorClass = tv({
  variants: {
    variant: {
      bare: `accent-muted-fg`,
      flat: `accent-fg-bg30`,
    },
  },
});

const inputClass = tv({
  base: ``,
  variants: {
    disabled: {
      true: `web:opacity-40`,
      false: ``,
    },
    textAlign: {
      left: `text-left`,
      center: `text-center`,
      right: `text-right`,
    },
    variant: {
      bare: `font-sans text-fg outline-none`,
      flat: `rounded-xl bg-bg-high px-4 py-3 pyly-body-input outline-none`,
    },
  },
});
