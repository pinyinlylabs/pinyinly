// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 田 (tián)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" tián"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Second tone"}</_components.strong>{" — "}<_components.strong>{"rising"}</_components.strong>{" tone, like asking a question: "}<_components.strong>{"\"What?\""}</_components.strong></_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"t"}</_components.strong>{" like "}<_components.strong>{"\"t\""}</_components.strong>{" in \"tea\""}</_components.li>{"\n"}<_components.li><_components.strong>{"ián"}</_components.strong>{" sounds like "}<_components.strong>{"\"yen\""}</_components.strong>{" in \"yen\", but with second tone → rising upward"}</_components.li>{"\n"}<_components.li><_components.strong>{"tián"}</_components.strong>{" sounds like "}<_components.strong>{"\"tyen?\""}</_components.strong>{" with a questioning rise"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"田 (tián) - \"field\""}</_components.li>{"\n"}<_components.li>{"田地 (tián dì) - \"farmland\""}</_components.li>{"\n"}<_components.li>{"田野 (tián yě) - \"field; countryside\""}</_components.li>{"\n"}<_components.li>{"水田 (shuǐ tián) - \"rice field\""}</_components.li>{"\n"}<_components.li>{"油田 (yóu tián) - \"oil field\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"Second tone rises like asking "}<_components.strong>{"\"Field?\""}</_components.strong>{" - your voice goes "}<_components.strong>{"up"}</_components.strong>{" throughout "}<_components.strong>{"tián"}</_components.strong>{"."}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
