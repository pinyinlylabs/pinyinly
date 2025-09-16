// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 裙 (qún)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" qún"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Second tone"}</_components.strong>{" — "}<_components.strong>{"rising"}</_components.strong>{" tone, like asking a question"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"q"}</_components.strong>{" like "}<_components.strong>{"\"ch\""}</_components.strong>{" in \"cheese\" but with lips more rounded"}</_components.li>{"\n"}<_components.li><_components.strong>{"ún"}</_components.strong>{" sounds like "}<_components.strong>{"\"wun\""}</_components.strong>{" in \"won\" but with rising tone"}</_components.li>{"\n"}<_components.li><_components.strong>{"qún"}</_components.strong>{" sounds like "}<_components.strong>{"\"chwun?\""}</_components.strong>{" with a questioning rise"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"裙 (qún) - \"skirt\""}</_components.li>{"\n"}<_components.li>{"裙子 (qún zi) - \"skirt\""}</_components.li>{"\n"}<_components.li>{"连衣裙 (lián yī qún) - \"dress\""}</_components.li>{"\n"}<_components.li>{"短裙 (duǎn qún) - \"short skirt\""}</_components.li>{"\n"}<_components.li>{"长裙 (cháng qún) - \"long skirt\""}</_components.li>{"\n"}<_components.li>{"百褶裙 (bǎi zhě qún) - \"pleated skirt\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The rising second tone is like the swishing sound a skirt makes when someone spins around - it\nstarts low and rises up gracefully!"}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
