// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 丁 (dīng)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" dīng"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: First tone"}</_components.strong>{" — "}<_components.strong>{"high and flat"}</_components.strong>{" tone, like a steady note: "}<_components.strong>{"\"Ding\""}</_components.strong></_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"d"}</_components.strong>{" like "}<_components.strong>{"\"d\""}</_components.strong>{" in \"dog\""}</_components.li>{"\n"}<_components.li><_components.strong>{"īng"}</_components.strong>{" sounds like "}<_components.strong>{"\"ing\""}</_components.strong>{" in \"sing\", but with first tone → high and steady"}</_components.li>{"\n"}<_components.li><_components.strong>{"dīng"}</_components.strong>{" sounds like "}<_components.strong>{"\"ding\""}</_components.strong>{" with a high, flat pitch"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"first tone"}</_components.strong>{" (¯) is a "}<_components.strong>{"high and flat"}</_components.strong>{" tone:"}</_components.p>{"\n"}<_components.p>{"Say it like you're holding a steady note: "}<_components.strong>{"\"dīng...\""}</_components.strong>{" — that's the tone pattern of "}<_components.strong>{"dīng"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"丁 (dīng) - \"4th (in sequence)\""}</_components.li>{"\n"}<_components.li>{"丁字路 (dīng zì lù) - \"T-junction\""}</_components.li>{"\n"}<_components.li>{"园丁 (yuán dīng) - \"gardener\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Special Notes:"}</_components.strong></_components.p>{"\n"}<_components.p>{"丁 is commonly used as an ordinal marker meaning \"fourth\" in traditional Chinese sequencing\n(甲乙丙丁). It can also mean \"male adult\" or appear in compound words related to people or\nprofessions."}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
