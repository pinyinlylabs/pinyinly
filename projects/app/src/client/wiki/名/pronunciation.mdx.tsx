// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 名 (míng)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" míng"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Second tone"}</_components.strong>{" — "}<_components.strong>{"rising"}</_components.strong>{" tone, like asking a question"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"m"}</_components.strong>{" like "}<_components.strong>{"\"m\""}</_components.strong>{" in \"mom\""}</_components.li>{"\n"}<_components.li><_components.strong>{"íng"}</_components.strong>{" sounds like "}<_components.strong>{"\"ing\""}</_components.strong>{" in \"sing\" but with a rising tone"}</_components.li>{"\n"}<_components.li><_components.strong>{"míng"}</_components.strong>{" sounds like "}<_components.strong>{"\"ming?\""}</_components.strong>{" with a questioning rise"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"second tone"}</_components.strong>{" (ˊ) "}<_components.strong>{"rises"}</_components.strong>{" like asking a question:"}</_components.p>{"\n"}<_components.p>{"Say it like you're asking \"Name?\" — that's the energy of "}<_components.strong>{"míng"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"名字 (míng zi) - \"name\""}</_components.li>{"\n"}<_components.li>{"有名 (yǒu míng) - \"famous\""}</_components.li>{"\n"}<_components.li>{"姓名 (xìng míng) - \"full name\""}</_components.li>{"\n"}<_components.li>{"名牌 (míng pái) - \"brand name\""}</_components.li>{"\n"}<_components.li>{"名单 (míng dān) - \"name list\""}</_components.li>{"\n"}</_components.ul></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
