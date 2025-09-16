// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 停 (tíng)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" tíng"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Second tone"}</_components.strong>{" — "}<_components.strong>{"rising"}</_components.strong>{" tone, like asking a question"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"t"}</_components.strong>{" like the English "}<_components.strong>{"\"t\""}</_components.strong>{" in \"top\", but "}<_components.strong>{"stronger and more aspirated"}</_components.strong>{" — with a clear puff\nof air"}</_components.li>{"\n"}<_components.li><_components.strong>{"íng"}</_components.strong>{" sounds like "}<_components.strong>{"\"eeng\""}</_components.strong>{" but with a rising tone"}</_components.li>{"\n"}<_components.li><_components.strong>{"tíng"}</_components.strong>{" sounds like "}<_components.strong>{"\"teeng?\""}</_components.strong>{" with a questioning rise"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"second tone"}</_components.strong>{" (´) is a "}<_components.strong>{"rising"}</_components.strong>{" tone:"}</_components.p>{"\n"}<_components.p>{"Say it like you're asking a question: "}<_components.strong>{"\"tíng?\""}</_components.strong>{" — that's the tone pattern of "}<_components.strong>{"tíng"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"停 (tíng) - \"stop\""}</_components.li>{"\n"}<_components.li>{"停车 (tíng chē) - \"park (a car)\""}</_components.li>{"\n"}<_components.li>{"停止 (tíng zhǐ) - \"cease\""}</_components.li>{"\n"}<_components.li>{"停下 (tíng xià) - \"stop (come to a halt)\""}</_components.li>{"\n"}</_components.ul></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
