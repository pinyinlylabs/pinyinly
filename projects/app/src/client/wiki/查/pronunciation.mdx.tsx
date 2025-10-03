// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 查 (chá)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" chá"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Second tone"}</_components.strong>{" — "}<_components.strong>{"rising"}</_components.strong>{" tone, like asking a question"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"ch"}</_components.strong>{" like "}<_components.strong>{"\"ch\""}</_components.strong>{" in \"church\""}</_components.li>{"\n"}<_components.li><_components.strong>{"á"}</_components.strong>{" sounds like "}<_components.strong>{"\"ah\""}</_components.strong>{", but with second tone → rise up"}</_components.li>{"\n"}<_components.li><_components.strong>{"chá"}</_components.strong>{" sounds like "}<_components.strong>{"\"chah?\""}</_components.strong>{" with a rising tone"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"查 (chá) - \"investigate; check; look up\""}</_components.li>{"\n"}<_components.li>{"检查 (jiǎn chá) - \"inspect; examine\""}</_components.li>{"\n"}<_components.li>{"调查 (diào chá) - \"survey; investigate\""}</_components.li>{"\n"}<_components.li>{"查看 (chá kàn) - \"check; look at\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"When you "}<_components.strong>{"investigate"}</_components.strong>{", you're asking questions and searching higher — that's the rising second\ntone of "}<_components.strong>{"chá"}</_components.strong>{"!"}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
