// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 来 (lái)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" lái"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Second tone"}</_components.strong>{" — "}<_components.strong>{"rising"}</_components.strong>{" tone, like asking a question"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"l"}</_components.strong>{" like "}<_components.strong>{"\"l\""}</_components.strong>{" in \"let\""}</_components.li>{"\n"}<_components.li><_components.strong>{"ái"}</_components.strong>{" sounds like "}<_components.strong>{"\"eye\""}</_components.strong>{", but with second tone → rise up"}</_components.li>{"\n"}<_components.li><_components.strong>{"lái"}</_components.strong>{" sounds like "}<_components.strong>{"\"lie?\""}</_components.strong>{" with a rising tone"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"来 (lái) - \"come\""}</_components.li>{"\n"}<_components.li>{"来到 (lái dào) - \"arrive at\""}</_components.li>{"\n"}<_components.li>{"来自 (lái zì) - \"come from\""}</_components.li>{"\n"}<_components.li>{"本来 (běn lái) - \"originally\""}</_components.li>{"\n"}<_components.li>{"将来 (jiāng lái) - \"future\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"When someone "}<_components.strong>{"comes"}</_components.strong>{", their voice rises with excitement — that's the rising second tone of\n"}<_components.strong>{"lái"}</_components.strong>{"!"}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
