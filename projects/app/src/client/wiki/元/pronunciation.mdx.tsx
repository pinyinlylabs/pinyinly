// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 元 (yuán)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" yuán"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Second tone"}</_components.strong>{" — "}<_components.strong>{"rising"}</_components.strong>{" tone, like asking a question"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"yu"}</_components.strong>{" is pronounced as "}<_components.strong>{"\"ü\""}</_components.strong>{" - start by saying "}<_components.strong>{"\"ee\""}</_components.strong>{" (as in \"see\"), then round your lips as\nif saying "}<_components.strong>{"\"oo\""}</_components.strong>{" but keep your tongue in the \"ee\" position"}</_components.li>{"\n"}<_components.li><_components.strong>{"án"}</_components.strong>{" sounds like "}<_components.strong>{"\"ahn\""}</_components.strong>{" but with a rising tone"}</_components.li>{"\n"}<_components.li><_components.strong>{"yuán"}</_components.strong>{" sounds like "}<_components.strong>{"\"yü-ahn?\""}</_components.strong>{" with a questioning rise"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"second tone"}</_components.strong>{" (´) is a "}<_components.strong>{"rising"}</_components.strong>{" tone:"}</_components.p>{"\n"}<_components.p>{"Say it like you're asking a question: "}<_components.strong>{"\"yuán?\""}</_components.strong>{" — that's the tone pattern of "}<_components.strong>{"yuán"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"元 (yuán) - \"yuan\" (currency)"}</_components.li>{"\n"}<_components.li>{"元素 (yuán sù) - \"element\""}</_components.li>{"\n"}<_components.li>{"单元 (dān yuán) - \"unit\""}</_components.li>{"\n"}<_components.li>{"公元 (gōng yuán) - \"AD/CE\""}</_components.li>{"\n"}</_components.ul></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
