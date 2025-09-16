// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 兄 (xiōng)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" xiōng"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: First tone"}</_components.strong>{" — "}<_components.strong>{"high and flat"}</_components.strong>{" tone, like a steady note"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"x"}</_components.strong>{" like a soft "}<_components.strong>{"\"sh\""}</_components.strong>{" sound, but your tongue is much closer to your teeth"}</_components.li>{"\n"}<_components.li><_components.strong>{"iōng"}</_components.strong>{" sounds like "}<_components.strong>{"\"yohng\""}</_components.strong>{" held steady and high"}</_components.li>{"\n"}<_components.li><_components.strong>{"xiōng"}</_components.strong>{" sounds like "}<_components.strong>{"\"shyohng\""}</_components.strong>{" with a steady high pitch"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"first tone"}</_components.strong>{" (ˉ) is a "}<_components.strong>{"high and flat"}</_components.strong>{" tone:"}</_components.p>{"\n"}<_components.p>{"Say it like a steady note: "}<_components.strong>{"\"xiōng—\""}</_components.strong>{" — that's the tone pattern of "}<_components.strong>{"xiōng"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"兄 (xiōng) - \"elder brother\""}</_components.li>{"\n"}<_components.li>{"兄弟 (xiōng dì) - \"brothers\""}</_components.li>{"\n"}<_components.li>{"师兄 (shī xiōng) - \"senior fellow student\""}</_components.li>{"\n"}<_components.li>{"大兄 (dà xiōng) - \"big brother\""}</_components.li>{"\n"}</_components.ul></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
