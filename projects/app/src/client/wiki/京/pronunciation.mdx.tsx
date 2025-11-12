// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 京 (jīng)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" jīng"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: First tone"}</_components.strong>{" — "}<_components.strong>{"high and flat"}</_components.strong>{" tone, like a steady note: "}<_components.strong>{"\"Eeee\""}</_components.strong></_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"j"}</_components.strong>{" like "}<_components.strong>{"\"j\""}</_components.strong>{" in \"jar\""}</_components.li>{"\n"}<_components.li><_components.strong>{"īng"}</_components.strong>{" sounds like "}<_components.strong>{"\"ing\""}</_components.strong>{" in \"sing\", but with first tone → steady and high"}</_components.li>{"\n"}<_components.li><_components.strong>{"jīng"}</_components.strong>{" sounds like "}<_components.strong>{"\"jing\""}</_components.strong>{" with a steady high pitch"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"京 (jīng) - \"capital city\""}</_components.li>{"\n"}<_components.li>{"北京 (běi jīng) - \"Beijing\""}</_components.li>{"\n"}<_components.li>{"京剧 (jīng jù) - \"Peking opera\""}</_components.li>{"\n"}<_components.li>{"京城 (jīng chéng) - \"capital city\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"京 represents the "}<_components.strong>{"capital"}</_components.strong>{" - say "}<_components.strong>{"\"jing\""}</_components.strong>{" with the authority and steadiness (first tone)\nbefitting a great capital city!"}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
