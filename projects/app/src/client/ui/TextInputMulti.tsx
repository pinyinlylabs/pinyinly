import { mergeRefs } from "@/client/react";
import type { PropsOf } from "@pinyinly/lib/types";
import type { Ref } from "react";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { TextInput } from "react-native";
import { tv } from "tailwind-variants";
import type { TextInputVariant } from "./TextInputSingle";

interface TextInputMultiProps extends Omit<
  PropsOf<typeof TextInput>,
  // make `placeholder` mandatory (encourage a11y)
  `placeholder` | `multiline` | `textAlignVertical`
> {
  disabled?: boolean;
  placeholder: string | undefined;
  autoResizeMinHeight?: number;
  ref?: Ref<TextInput>;
  variant?: TextInputVariant;
}

export function TextInputMulti({
  variant = `flat`,
  ref,
  ...props
}: TextInputMultiProps) {
  const inputRef = useRef<TextInput>(null);
  const autoResizeMinHeight = props.autoResizeMinHeight ?? 60;

  const adjustHeight = useCallback(() => {
    if (typeof window === `undefined`) {
      return;
    }

    const element = inputRef.current as HTMLTextAreaElement | null;
    if (!element || element.tagName !== `TEXTAREA`) {
      return;
    }

    element.style.height = `auto`;
    element.style.height = `${Math.max(element.scrollHeight, autoResizeMinHeight)}px`;
  }, [autoResizeMinHeight]);

  // On web, auto-resize the textarea to fit content
  useEffect(() => {
    if (typeof window === `undefined`) {
      return;
    } // Skip on native

    const element = inputRef.current as HTMLTextAreaElement | null;
    if (!element) {
      return;
    } // Not a textarea

    const textarea = element;
    if (textarea.tagName !== `TEXTAREA`) {
      return;
    }

    adjustHeight();
    textarea.addEventListener(`input`, adjustHeight);
    return () => {
      textarea.removeEventListener(`input`, adjustHeight);
    };
  }, [adjustHeight]);

  useLayoutEffect(() => {
    adjustHeight();
  }, [adjustHeight, props.value]);

  return (
    <TextInput
      {...props}
      ref={mergeRefs(ref, inputRef)}
      multiline
      // @ts-expect-error `dataSet` isn't a standard prop in react-native, but it exists for react-native-web
      // since https://github.com/necolas/react-native-web/releases/tag/0.13.0
      dataSet={{
        // Disable the 1Password button in inputs.
        "1p-ignore": `true`,
      }}
      style={[props.style, { overflow: `visible` }]}
      className={inputClass({
        textAlign: props.textAlign,
        className: props.className,
        variant,
      })}
    />
  );
}

const inputClass = tv({
  base: `
    resize-none

    web:block
  `,
  variants: {
    textAlign: {
      left: `text-left`,
      center: `text-center`,
      right: `text-right`,
    },
    variant: {
      bare: `
        font-sans text-sm font-medium text-fg outline-none

        placeholder:text-fg-dim
      `,
      flat: `
        pyly-body-input rounded-xl bg-bg-high px-4 py-3 outline-none

        placeholder:text-fg/30
      `,
    },
  },
});
