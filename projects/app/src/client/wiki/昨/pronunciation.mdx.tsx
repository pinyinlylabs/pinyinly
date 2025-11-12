// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 昨 (zuó)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" zuó"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Second tone"}</_components.strong>{" — "}<_components.strong>{"rising"}</_components.strong>{" tone, like asking a question"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"z"}</_components.strong>{" like "}<_components.strong>{"\"ds\""}</_components.strong>{" in \"kids\" — a buzzing sound"}</_components.li>{"\n"}<_components.li><_components.strong>{"uó"}</_components.strong>{" sounds like "}<_components.strong>{"\"wo\""}</_components.strong>{" in \"woke\" but with second tone → rising upward"}</_components.li>{"\n"}<_components.li><_components.strong>{"zuó"}</_components.strong>{" sounds like "}<_components.strong>{"\"dzwo?\""}</_components.strong>{" with a questioning rise"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"second tone"}</_components.strong>{" (ˊ) is a "}<_components.strong>{"rising"}</_components.strong>{" tone:"}</_components.p>{"\n"}<_components.p>{"Say it like you're asking about yesterday: "}<_components.strong>{"\"zuó?\""}</_components.strong>{" — that upward rise is the second tone pattern."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"昨 (zuó) - \"yesterday\""}</_components.li>{"\n"}<_components.li>{"昨天 (zuó tiān) - \"yesterday\""}</_components.li>{"\n"}<_components.li>{"昨日 (zuó rì) - \"yesterday\" (more formal)"}</_components.li>{"\n"}</_components.ul></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
