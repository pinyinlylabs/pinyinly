// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 龙 (lóng)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" lóng"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Second tone"}</_components.strong>{" — "}<_components.strong>{"rising"}</_components.strong>{" tone, like asking a question"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"l"}</_components.strong>{" like "}<_components.strong>{"\"l\""}</_components.strong>{" in \"long\""}</_components.li>{"\n"}<_components.li><_components.strong>{"óng"}</_components.strong>{" sounds like "}<_components.strong>{"\"ong\""}</_components.strong>{" in \"song\", but with second tone → rising up"}</_components.li>{"\n"}<_components.li><_components.strong>{"lóng"}</_components.strong>{" sounds like "}<_components.strong>{"\"long?\""}</_components.strong>{" with a questioning rise"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"second tone"}</_components.strong>{" (´) is a "}<_components.strong>{"rising"}</_components.strong>{" tone:"}</_components.p>{"\n"}<_components.p>{"Start low and go up, like asking a question: "}<_components.strong>{"\"lóng?\""}</_components.strong>{" — that's the tone pattern of "}<_components.strong>{"lóng"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"龙 (lóng) - \"dragon\""}</_components.li>{"\n"}<_components.li>{"恐龙 (kǒng lóng) - \"dinosaur\""}</_components.li>{"\n"}<_components.li>{"龙舟 (lóng zhōu) - \"dragon boat\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"Imagine a dragon "}<_components.strong>{"rising"}</_components.strong>{" into the sky with that ascending "}<_components.strong>{"\"lóng?\""}</_components.strong>{" sound — majestic and\npowerful!"}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
