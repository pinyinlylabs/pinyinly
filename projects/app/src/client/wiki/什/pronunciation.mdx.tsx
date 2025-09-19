// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 什 (shén)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" shén"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Second tone"}</_components.strong>{" — "}<_components.strong>{"rising"}</_components.strong>{" tone, like asking a question"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"sh"}</_components.strong>{" like "}<_components.strong>{"\"sh\""}</_components.strong>{" in \"she\""}</_components.li>{"\n"}<_components.li><_components.strong>{"én"}</_components.strong>{" sounds like "}<_components.strong>{"\"en\""}</_components.strong>{" in \"pen\", but with second tone → rising like a question"}</_components.li>{"\n"}<_components.li><_components.strong>{"shén"}</_components.strong>{" sounds like "}<_components.strong>{"\"shen?\""}</_components.strong>{" with a questioning rise"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"什么 (shén me) - \"what\""}</_components.li>{"\n"}<_components.li>{"什么样 (shén me yàng) - \"what kind\""}</_components.li>{"\n"}<_components.li>{"为什么 (wèi shén me) - \"why\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"📍 Special Note:"}</_components.strong></_components.p>{"\n"}<_components.p>{"什 is rarely used alone in modern Chinese. It's almost always found in the compound "}<_components.strong>{"什么"}</_components.strong>{" (shén\nme) meaning \"what\". The pronunciation fits perfectly with its questioning meaning!"}</_components.p>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"什 means "}<_components.strong>{"what"}</_components.strong>{" - say "}<_components.strong>{"\"shen?\""}</_components.strong>{" with a curious, rising tone (second tone), perfect for asking\nquestions!"}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
