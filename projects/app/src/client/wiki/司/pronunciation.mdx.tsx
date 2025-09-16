// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 司 (sī)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" sī"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: First tone"}</_components.strong>{" — "}<_components.strong>{"high and flat"}</_components.strong>{" tone, like a steady note: "}<_components.strong>{"\"Eeee\""}</_components.strong></_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"s"}</_components.strong>{" like "}<_components.strong>{"\"s\""}</_components.strong>{" in \"sun\""}</_components.li>{"\n"}<_components.li><_components.strong>{"ī"}</_components.strong>{" sounds like "}<_components.strong>{"\"ee\""}</_components.strong>{" in \"see\" but held steady and high"}</_components.li>{"\n"}<_components.li><_components.strong>{"sī"}</_components.strong>{" sounds like "}<_components.strong>{"\"see\""}</_components.strong>{" with a steady high pitch"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"first tone"}</_components.strong>{" (¯) is "}<_components.strong>{"steady and high"}</_components.strong>{":"}</_components.p>{"\n"}<_components.p>{"Say it like you're holding a long musical note — that's the energy of "}<_components.strong>{"sī"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"司机 (sī jī) - \"driver\""}</_components.li>{"\n"}<_components.li>{"司令 (sī lìng) - \"commander\""}</_components.li>{"\n"}<_components.li>{"公司 (gōng sī) - \"company\""}</_components.li>{"\n"}<_components.li>{"司法 (sī fǎ) - \"judicial\""}</_components.li>{"\n"}</_components.ul></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
