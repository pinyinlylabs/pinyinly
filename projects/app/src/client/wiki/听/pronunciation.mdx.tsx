// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 听 (tīng)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" tīng"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: First tone"}</_components.strong>{" — "}<_components.strong>{"high and flat"}</_components.strong>{" tone, like a steady note: "}<_components.strong>{"\"Eeee\""}</_components.strong></_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"t"}</_components.strong>{" like "}<_components.strong>{"\"t\""}</_components.strong>{" in \"tea\", but "}<_components.strong>{"unaspirated"}</_components.strong>{" — no strong puff of air"}</_components.li>{"\n"}<_components.li><_components.strong>{"īng"}</_components.strong>{" sounds like "}<_components.strong>{"\"eeng\""}</_components.strong>{" in \"seeing\" but held steady and high"}</_components.li>{"\n"}<_components.li><_components.strong>{"tīng"}</_components.strong>{" sounds like "}<_components.strong>{"\"teeng\""}</_components.strong>{" with a steady high pitch"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"first tone"}</_components.strong>{" (ˉ) is a "}<_components.strong>{"high and flat"}</_components.strong>{" tone:"}</_components.p>{"\n"}<_components.p>{"Say it like you're holding a steady musical note: "}<_components.strong>{"\"tīng...\""}</_components.strong>{" — keep the pitch high and level."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"听 (tīng) - \"hear; listen\""}</_components.li>{"\n"}<_components.li>{"听说 (tīng shuō) - \"heard; I heard that\""}</_components.li>{"\n"}<_components.li>{"听见 (tīng jiàn) - \"hear\""}</_components.li>{"\n"}<_components.li>{"听众 (tīng zhòng) - \"audience\""}</_components.li>{"\n"}<_components.li>{"听课 (tīng kè) - \"attend class\""}</_components.li>{"\n"}<_components.li>{"听音乐 (tīng yīn yuè) - \"listen to music\""}</_components.li>{"\n"}</_components.ul></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
