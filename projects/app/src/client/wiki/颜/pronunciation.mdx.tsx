// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 颜 (yán)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" yán"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Second tone"}</_components.strong>{" — "}<_components.strong>{"rising"}</_components.strong>{" tone, like asking a question: \"yan?\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"y"}</_components.strong>{" like "}<_components.strong>{"\"y\""}</_components.strong>{" in \"yes\""}</_components.li>{"\n"}<_components.li><_components.strong>{"án"}</_components.strong>{" sounds like "}<_components.strong>{"\"ahn\""}</_components.strong>{" but with a rising tone"}</_components.li>{"\n"}<_components.li><_components.strong>{"yán"}</_components.strong>{" sounds like "}<_components.strong>{"\"yahn\""}</_components.strong>{" with an upward inflection"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"second tone"}</_components.strong>{" (´) is a "}<_components.strong>{"rising"}</_components.strong>{" tone. Start low and rise up, like when you're asking\n\"Really?\" in English."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"颜色 (yán sè) - \"color\""}</_components.li>{"\n"}<_components.li>{"颜料 (yán liào) - \"paint, pigment\""}</_components.li>{"\n"}<_components.li>{"颜面 (yán miàn) - \"face, dignity\""}</_components.li>{"\n"}<_components.li>{"红颜 (hóng yán) - \"beautiful woman\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"Think of asking \"What color (颜色) is that?\" - the questioning tone matches the rising second tone\nof "}<_components.strong>{"yán"}</_components.strong>{"."}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
