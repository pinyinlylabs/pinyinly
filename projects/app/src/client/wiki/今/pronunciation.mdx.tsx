// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 今 (jīn)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" jīn"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: First tone"}</_components.strong>{" — "}<_components.strong>{"high and flat"}</_components.strong>{" tone, like a steady note: "}<_components.strong>{"\"Eeee\""}</_components.strong></_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"j"}</_components.strong>{" like "}<_components.strong>{"\"j\""}</_components.strong>{" in \"jar\""}</_components.li>{"\n"}<_components.li><_components.strong>{"īn"}</_components.strong>{" sounds like "}<_components.strong>{"\"een\""}</_components.strong>{" in \"seen\", but with first tone → steady and high"}</_components.li>{"\n"}<_components.li><_components.strong>{"jīn"}</_components.strong>{" sounds like "}<_components.strong>{"\"jeen\""}</_components.strong>{" with a steady high pitch"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"今 (jīn) - \"now\", \"today\""}</_components.li>{"\n"}<_components.li>{"今天 (jīn tiān) - \"today\""}</_components.li>{"\n"}<_components.li>{"今年 (jīn nián) - \"this year\""}</_components.li>{"\n"}<_components.li>{"今后 (jīn hòu) - \"from now on\""}</_components.li>{"\n"}<_components.li>{"如今 (rú jīn) - \"nowadays\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"今 means "}<_components.strong>{"now"}</_components.strong>{" or "}<_components.strong>{"today"}</_components.strong>{" - say "}<_components.strong>{"\"jeen\""}</_components.strong>{" with confidence and steadiness (first tone),\nemphasizing the present moment!"}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
