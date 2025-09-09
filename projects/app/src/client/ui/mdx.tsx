// Adaptation from https://github.com/EvanBacon/expo-mdx/blob/6f27605c23400ed42d014dcef77ba11244d08f82/packages/mdx/src/

import * as html from "@expo/html-elements";
import type { ComponentType, JSX } from "react";
import { createContext } from "react";
import type { TextProps, ViewProps } from "react-native";
import { Image, Platform, Text, View } from "react-native";

export type MdxComponentsType = Record<string, ComponentType>;

export type MdxComponentType = React.FC<{
  components?: MdxComponentsType;
}>;

function Img({ src, style }: React.ComponentProps<typeof Image>) {
  const source = typeof src === `string` ? { uri: src } : src;
  return <Image source={source} style={style} className="pyly-mdx-img" />;
}

/* Lint CSS classes */
const ctl = (classes: string) => classes;

export const defaultMdxComponents = {
  h1: makeHeading(1, { className: ctl(`pyly-mdx-h1`) }),
  h2: makeHeading(2, { className: ctl(`pyly-mdx-h2`) }),
  h3: makeHeading(3, { className: ctl(`pyly-mdx-h3`) }),
  h4: makeHeading(4, { className: ctl(`pyly-mdx-h4`) }),
  h5: makeHeading(5, { className: ctl(`pyly-mdx-h5`) }),
  h6: makeHeading(6, { className: ctl(`pyly-mdx-h6`) }),
  b: makeMdx({ className: ctl(`pyly-mdx-b`) }, Text),
  strong: makeMdx({ className: ctl(`pyly-mdx-strong`) }, Text),
  s: makeMdx({ className: ctl(`pyly-mdx-s`) }, Text),
  del: makeMdx({ className: ctl(`pyly-mdx-del`) }, Text),
  q: makeMdx({ className: ctl(`pyly-mdx-q`) }, Text),
  i: makeMdx({ className: ctl(`pyly-mdx-i`) }, Text),
  em: makeMdx({ className: ctl(`pyly-mdx-em`) }, Text),
  p: makeMdx({ className: ctl(`pyly-mdx-p`) }, Text),
  pre: makeMdx({ className: ctl(`pyly-mdx-pre`) }, Text),
  code: makeMdx({ className: ctl(`pyly-mdx-code`) }, Text),
  mark: makeMdx({ className: ctl(`pyly-mdx-mark`) }, Text),
  inlineCode: makeMdx({ className: ctl(`pyly-mdx-inlineCode`) }, Text),
  span: makeMdx({ className: ctl(`pyly-mdx-span`) }, Text),
  a: makeMdx({ className: ctl(`pyly-mdx-a`) }, html.A),
  nav: makeMdx({ className: ctl(`pyly-mdx-nav`) }, html.Nav),
  footer: makeMdx({ className: ctl(`pyly-mdx-footer`) }, html.Footer),
  aside: makeMdx({ className: ctl(`pyly-mdx-aside`) }, html.Aside),
  header: makeMdx({ className: ctl(`pyly-mdx-header`) }, html.Header),
  main: makeMdx({ className: ctl(`pyly-mdx-main`) }, html.Main),
  article: makeMdx({ className: ctl(`pyly-mdx-article`) }, html.Article),
  section: makeMdx({ className: ctl(`pyly-mdx-section`) }, html.Section),
  br: makeMdx({ className: ctl(`pyly-mdx-br`) }, html.BR),
  time: makeMdx({ className: ctl(`pyly-mdx-time`) }, html.Time),
  hr: makeMdx({ className: ctl(`pyly-mdx-hr`) }, html.HR),
  div: makeMdx({ className: ctl(`pyly-mdx-div`) }, View),
  img: makeMdx({ className: ctl(`pyly-mdx-img`) }, Img),
  blockquote: makeMdx({ className: ctl(`pyly-mdx-blockquote`) }, Text),
  table: makeMdx({ className: ctl(`pyly-mdx-table`) }, View),
  thead: makeMdx({ className: ctl(`pyly-mdx-thead`) }, View),
  tbody: makeMdx({ className: ctl(`pyly-mdx-tbody`) }, View),
  tr: makeMdx({ className: ctl(`pyly-mdx-tr`) }, View),
} as const satisfies MdxComponentsType;

export const MDXComponentsContext =
  createContext<MdxComponentsType>(defaultMdxComponents);

function makeMdx(
  staticProps: {
    // Using an object here to receive `className` allows the value to be linted
    // by the tailwind eslint plugin to make sure it's a valid class.
    className: string;
    [key: string]: unknown;
  },
  ElementType: keyof JSX.IntrinsicElements | ComponentType,
): React.ComponentType {
  const { className, ...otherStaticProps } = staticProps;
  function MdxComponent(props: Pick<ViewProps, `className`>) {
    return (
      <ElementType
        {...otherStaticProps}
        {...props}
        className={`
          ${className}
          ${props.className ?? ``}
        `}
      />
    );
  }
  if (__DEV__) {
    MdxComponent.displayName = `MdxComponent-${className}`;
  }
  return MdxComponent;
}

function makeHeading(level: number, { className }: { className: string }) {
  const nativeProps = Platform.select<TextProps>({
    web: {
      // @ts-expect-error "aria-level" isn't supported in the RN types, but it is supported in the web.
      "aria-level": level,
      role: `heading`,
    },
    default: {
      accessibilityRole: `header`,
    },
  });

  return makeMdx({ className, ...nativeProps }, Text);
}
