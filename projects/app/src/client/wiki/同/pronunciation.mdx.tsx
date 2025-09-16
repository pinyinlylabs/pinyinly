// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 同 (tóng)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" tóng"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Second tone"}</_components.strong>{" — "}<_components.strong>{"rising"}</_components.strong>{" tone, like asking a question"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"t"}</_components.strong>{" like "}<_components.strong>{"\"t\""}</_components.strong>{" in \"top\""}</_components.li>{"\n"}<_components.li><_components.strong>{"óng"}</_components.strong>{" sounds like "}<_components.strong>{"\"ong\""}</_components.strong>{" in \"song\" but with a rising tone"}</_components.li>{"\n"}<_components.li><_components.strong>{"tóng"}</_components.strong>{" sounds like "}<_components.strong>{"\"tong?\""}</_components.strong>{" with a questioning rise"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"second tone"}</_components.strong>{" (ˊ) "}<_components.strong>{"rises"}</_components.strong>{" like asking a question:"}</_components.p>{"\n"}<_components.p>{"Say it like you're asking \"Really?\" — that's the energy of "}<_components.strong>{"tóng"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"同学 (tóng xué) - \"classmate\""}</_components.li>{"\n"}<_components.li>{"同事 (tóng shì) - \"colleague\""}</_components.li>{"\n"}<_components.li>{"同意 (tóng yì) - \"agree\""}</_components.li>{"\n"}<_components.li>{"同时 (tóng shí) - \"at the same time\""}</_components.li>{"\n"}<_components.li>{"不同 (bù tóng) - \"different\""}</_components.li>{"\n"}</_components.ul></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
