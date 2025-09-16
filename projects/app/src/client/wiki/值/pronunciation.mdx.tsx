// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 值 (zhí)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" zhí"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Second tone"}</_components.strong>{" — "}<_components.strong>{"rising"}</_components.strong>{" tone, like asking a question"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"zh"}</_components.strong>{" like the English "}<_components.strong>{"\"j\""}</_components.strong>{" in \"jam\", but with the "}<_components.strong>{"tongue curled back"}</_components.strong></_components.li>{"\n"}<_components.li><_components.strong>{"í"}</_components.strong>{" sounds like "}<_components.strong>{"\"ee\""}</_components.strong>{" in \"see\" but with a rising tone"}</_components.li>{"\n"}<_components.li><_components.strong>{"zhí"}</_components.strong>{" sounds like "}<_components.strong>{"\"zhee?\""}</_components.strong>{" with a questioning rise"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"second tone"}</_components.strong>{" (´) is a "}<_components.strong>{"rising"}</_components.strong>{" tone:"}</_components.p>{"\n"}<_components.p>{"Say it like you're asking a question: "}<_components.strong>{"\"zhí?\""}</_components.strong>{" — that's the tone pattern of "}<_components.strong>{"zhí"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"值 (zhí) - \"be worth\""}</_components.li>{"\n"}<_components.li>{"值得 (zhí de) - \"worthwhile\""}</_components.li>{"\n"}<_components.li>{"价值 (jià zhí) - \"value\""}</_components.li>{"\n"}<_components.li>{"数值 (shù zhí) - \"numerical value\""}</_components.li>{"\n"}</_components.ul></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
