// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 男 (nán)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" nán"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Second tone"}</_components.strong>{" — "}<_components.strong>{"rising"}</_components.strong>{" tone, like asking a question: "}<_components.strong>{"\"What?\""}</_components.strong></_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"n"}</_components.strong>{" like "}<_components.strong>{"\"n\""}</_components.strong>{" in \"no\""}</_components.li>{"\n"}<_components.li><_components.strong>{"án"}</_components.strong>{" sounds like "}<_components.strong>{"\"an\""}</_components.strong>{" in \"can\", but with second tone → rising upward"}</_components.li>{"\n"}<_components.li><_components.strong>{"nán"}</_components.strong>{" sounds like "}<_components.strong>{"\"nahn?\""}</_components.strong>{" with a questioning rise"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"男 (nán) - \"male; man\""}</_components.li>{"\n"}<_components.li>{"男人 (nán rén) - \"man\""}</_components.li>{"\n"}<_components.li>{"男孩儿 (nán hái er) - \"boy\""}</_components.li>{"\n"}<_components.li>{"男朋友 (nán péng yǒu) - \"boyfriend\""}</_components.li>{"\n"}<_components.li>{"男生 (nán shēng) - \"male student\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"Second tone rises like asking "}<_components.strong>{"\"Man?\""}</_components.strong>{" - your voice goes "}<_components.strong>{"up"}</_components.strong>{" throughout "}<_components.strong>{"nán"}</_components.strong>{"."}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
