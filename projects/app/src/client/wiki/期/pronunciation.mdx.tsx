// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 期 (qī)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" qī"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: First tone"}</_components.strong>{" — "}<_components.strong>{"high and flat"}</_components.strong>{" tone, like a steady note"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"q"}</_components.strong>{" like "}<_components.strong>{"\"ch\""}</_components.strong>{" in \"cheese\" (but more aspirated)"}</_components.li>{"\n"}<_components.li><_components.strong>{"ī"}</_components.strong>{" sounds like "}<_components.strong>{"\"ee\""}</_components.strong>{" in \"see\" but held steady and high"}</_components.li>{"\n"}<_components.li><_components.strong>{"qī"}</_components.strong>{" sounds like "}<_components.strong>{"\"chee\""}</_components.strong>{" with a steady high pitch"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"first tone"}</_components.strong>{" (¯) is a "}<_components.strong>{"high and flat"}</_components.strong>{" tone:"}</_components.p>{"\n"}<_components.p>{"Say it like singing a steady high note: "}<_components.strong>{"\"qī\""}</_components.strong>{" — that even, high pitch is the first tone pattern."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"期 (qī) - \"period, time period\""}</_components.li>{"\n"}<_components.li>{"学期 (xué qī) - \"semester, term\""}</_components.li>{"\n"}<_components.li>{"期待 (qī dài) - \"to expect, to look forward to\""}</_components.li>{"\n"}<_components.li>{"日期 (rì qī) - \"date\""}</_components.li>{"\n"}<_components.li>{"星期 (xīng qī) - \"week\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"Think of "}<_components.strong>{"期"}</_components.strong>{" as marking a steady \"period\" of time — the flat, consistent first tone matches the\nsteady flow of time periods!"}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
