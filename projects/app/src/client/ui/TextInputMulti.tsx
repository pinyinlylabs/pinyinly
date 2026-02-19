import type { PropsOf } from "@pinyinly/lib/types";
import type { Ref } from "react";
import { useEffect, useRef } from "react";
import { TextInput } from "react-native";
import { tv } from "tailwind-variants";

interface TextInputMultiProps extends Omit<
  PropsOf<typeof TextInput>,
  // make `placeholder` mandatory (encourage a11y)
  `placeholder` | `multiline` | `textAlignVertical`
> {
  disabled?: boolean;
  placeholder: string | undefined;
  ref?: Ref<TextInput>;
}

export function TextInputMulti(props: TextInputMultiProps) {
  const innerRef = useRef<any>(null);

  // On web, auto-resize the textarea to fit content
  useEffect(() => {
    if (typeof window === `undefined`) {
      return;
    } // Skip on native

    const element = innerRef.current;
    if (!element || !element._nativeTag) {
      return;
    } // Not a textarea

    const textarea = element._nativeTag;
    if (textarea?.tagName !== `TEXTAREA`) {
      return;
    }

    const adjustHeight = () => {
      textarea.style.height = `auto`;
      textarea.style.height = `${Math.max(textarea.scrollHeight, 60)}px`;
    };

    adjustHeight();
    textarea.addEventListener(`input`, adjustHeight);
    return () => textarea.removeEventListener(`input`, adjustHeight);
  }, []);

  return (
    <TextInput
      ref={innerRef}
      {...props}
      multiline
      // @ts-expect-error `dataSet` isn't a standard prop in react-native, but it exists for react-native-web
      // since https://github.com/necolas/react-native-web/releases/tag/0.13.0
      dataSet={{
        // Disable the 1Password button in inputs.
        "1p-ignore": `true`,
      }}
      style={{
        ...(props.style as any),
        overflow: `visible`,
      }}
      className={inputClass({
        textAlign: props.textAlign,
        className: props.className,
      })}
    />
  );
}

const inputClass = tv({
  base: `
    pyly-body-input resize-none rounded-xl bg-bg-high px-4 py-3 outline-none

    placeholder:text-fg/30

    web:block
  `,
  variants: {
    textAlign: {
      left: `text-left`,
      center: `text-center`,
      right: `text-right`,
    },
  },
});
