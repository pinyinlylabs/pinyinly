import { Slot } from "@rn-primitives/slot";
import React from "react";
// oxlint-disable-next-line no-restricted-imports
import { Platform, Text as RNText } from "react-native";
import type { Role } from "react-native";
import type { VariantProps } from "tailwind-variants";
import { cn, tv } from "tailwind-variants";

const textVariants = tv({
  base: cn(`web:select-text`),
  variants: {
    variant: {
      default: ``,
      h1: `
        text-center text-4xl font-extrabold tracking-tight

        web:scroll-m-20 web:text-balance
      `,
      h2: `
        border-b border-fg pb-2 text-3xl font-semibold tracking-tight

        web:scroll-m-20

        web:first:mt-0
      `,
      h3: `
        text-2xl font-semibold tracking-tight

        web:scroll-m-20
      `,
      h4: `
        text-xl font-semibold tracking-tight

        web:scroll-m-20
      `,
      p: `
        mt-3 leading-7

        sm:mt-6
      `,
      blockquote: `
        mt-4 border-l-2 pl-3 italic

        sm:mt-6 sm:pl-6
      `,
      code: cn(
        `relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold`,
      ),
      lead: `text-xl text-muted-fg`,
      large: `text-lg font-semibold`,
      small: `text-sm leading-none font-medium`,
      muted: `text-sm text-muted-fg`,
    },
  },
  defaultVariants: {
    variant: `default`,
  },
});

type TextVariantProps = VariantProps<typeof textVariants>;

type TextVariant = NonNullable<TextVariantProps[`variant`]>;

const ROLE: Partial<Record<TextVariant, Role>> = {
  h1: `heading`,
  h2: `heading`,
  h3: `heading`,
  h4: `heading`,
  blockquote: Platform.select({ web: `blockquote` as Role }),
  code: Platform.select({ web: `code` as Role }),
};

const ARIA_LEVEL: Partial<Record<TextVariant, string>> = {
  h1: `1`,
  h2: `2`,
  h3: `3`,
  h4: `4`,
};

const TextClassContext = React.createContext<string | undefined>(undefined);

function Text({
  className,
  asChild = false,
  variant = `default`,
  ...props
}: React.ComponentProps<typeof RNText> &
  React.RefAttributes<typeof RNText> &
  TextVariantProps & {
    asChild?: boolean;
  }) {
  const textClass = React.useContext(TextClassContext);
  const Component = asChild ? Slot : RNText;
  return (
    <Component
      className={cn(textVariants({ variant }), textClass, className)}
      role={ROLE[variant]}
      aria-level={ARIA_LEVEL[variant]}
      {...props}
    />
  );

  // const inheritedClassNames =
  //   className == null
  //     ? ``
  //     : className
  //         .split(/\s+/gu)
  //         .filter((x) => x.startsWith(`text-`))
  //         .join(` `);

  // return inheritedClassNames.length === 0 ? (
  //   children
  // ) : (
  //   // If a classname is provided, we provide it to children via context so that
  //   // nested Text components can inherit the className.
  //   <TextClassContext.Provider value={cn(textClass, inheritedClassNames)}>
  //     {children}
  //   </TextClassContext.Provider>
  // );
}

Text.ClassContext = TextClassContext;

export { Text };
