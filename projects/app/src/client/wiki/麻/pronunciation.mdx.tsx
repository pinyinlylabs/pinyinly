// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 麻 (má)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" má"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Second tone"}</_components.strong>{" — "}<_components.strong>{"rising"}</_components.strong>{" tone, like asking a question"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"m"}</_components.strong>{" like "}<_components.strong>{"\"m\""}</_components.strong>{" in \"ma\""}</_components.li>{"\n"}<_components.li><_components.strong>{"á"}</_components.strong>{" sounds like "}<_components.strong>{"\"ah\""}</_components.strong>{" but with a rising tone"}</_components.li>{"\n"}<_components.li><_components.strong>{"má"}</_components.strong>{" sounds like "}<_components.strong>{"\"ma?\""}</_components.strong>{" with a questioning rise, similar to calling \"Mom?\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"second tone"}</_components.strong>{" (ˊ) is a "}<_components.strong>{"rising"}</_components.strong>{" tone:"}</_components.p>{"\n"}<_components.p>{"Say it like you're asking a question about hemp: "}<_components.strong>{"\"má?\""}</_components.strong>{" — that rising, questioning intonation."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"麻 (má) - \"hemp\""}</_components.li>{"\n"}<_components.li>{"麻烦 (má fán) - \"trouble; troublesome\""}</_components.li>{"\n"}<_components.li>{"芝麻 (zhī má) - \"sesame\""}</_components.li>{"\n"}<_components.li>{"麻将 (má jiàng) - \"mahjong\""}</_components.li>{"\n"}<_components.li>{"麻油 (má yóu) - \"sesame oil\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"麻 with its rising tone sounds like questioning \"ma?\" — imagine asking your mom (ma) if she knows\nabout hemp: "}<_components.strong>{"\"má?\""}</_components.strong>{" with that rising, curious tone."}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
