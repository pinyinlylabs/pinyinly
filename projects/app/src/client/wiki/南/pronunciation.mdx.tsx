// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 南 (nán)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" nán"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Second tone"}</_components.strong>{" — "}<_components.strong>{"rising"}</_components.strong>{" tone, like asking a question"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"n"}</_components.strong>{" like "}<_components.strong>{"\"n\""}</_components.strong>{" in \"new\""}</_components.li>{"\n"}<_components.li><_components.strong>{"án"}</_components.strong>{" sounds like "}<_components.strong>{"\"ahn\""}</_components.strong>{" but with second tone → rise up like a question"}</_components.li>{"\n"}<_components.li><_components.strong>{"nán"}</_components.strong>{" sounds like "}<_components.strong>{"\"nahn?\""}</_components.strong>{" with a questioning rise"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"second tone"}</_components.strong>{" (´) is a "}<_components.strong>{"rising"}</_components.strong>{" tone: Start low and rise up, like you're asking \"Where?\" —\nthat's the tone pattern of "}<_components.strong>{"nán"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"南 (nán) - \"south\""}</_components.li>{"\n"}<_components.li>{"南方 (nán fāng) - \"the south\""}</_components.li>{"\n"}<_components.li>{"南边 (nán biān) - \"south side\""}</_components.li>{"\n"}<_components.li>{"东南 (dōng nán) - \"southeast\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"南 means \"south\" — when asking for directions, your voice naturally "}<_components.strong>{"rises"}</_components.strong>{" in question: \"Which\nway is south?\""}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
