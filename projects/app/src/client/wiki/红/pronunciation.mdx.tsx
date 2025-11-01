// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 红 (hóng)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" hóng"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Second tone"}</_components.strong>{" — "}<_components.strong>{"rising"}</_components.strong>{" tone, like asking a question"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"h"}</_components.strong>{" like "}<_components.strong>{"\"h\""}</_components.strong>{" in \"hot\""}</_components.li>{"\n"}<_components.li><_components.strong>{"óng"}</_components.strong>{" sounds like "}<_components.strong>{"\"ong\""}</_components.strong>{" in \"song\", but with second tone → rising up"}</_components.li>{"\n"}<_components.li><_components.strong>{"hóng"}</_components.strong>{" sounds like "}<_components.strong>{"\"hong?\""}</_components.strong>{" with a questioning rise"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"second tone"}</_components.strong>{" (ˊ) is a "}<_components.strong>{"rising"}</_components.strong>{" tone:"}</_components.p>{"\n"}<_components.p>{"Say it like you're surprised by something red: "}<_components.strong>{"\"hóng?\""}</_components.strong>{" — that's the rising pattern of "}<_components.strong>{"hóng"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"红 (hóng) - \"red\""}</_components.li>{"\n"}<_components.li>{"红色 (hóng sè) - \"red color\""}</_components.li>{"\n"}<_components.li>{"红茶 (hóng chá) - \"black tea\" (lit. \"red tea\")"}</_components.li>{"\n"}<_components.li>{"红酒 (hóng jiǔ) - \"red wine\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"Think of seeing something bright "}<_components.strong>{"red"}</_components.strong>{" and asking in surprise: "}<_components.strong>{"\"hóng?\""}</_components.strong>{" — the rising tone\nmatches your surprised reaction!"}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
