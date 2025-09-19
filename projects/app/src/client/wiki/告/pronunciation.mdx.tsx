// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 告 (gào)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" gào"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Fourth tone"}</_components.strong>{" — sharp "}<_components.strong>{"falling"}</_components.strong>{" tone, like giving a command: "}<_components.strong>{"\"Go!\""}</_components.strong></_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"g"}</_components.strong>{" like "}<_components.strong>{"\"g\""}</_components.strong>{" in \"go\", but "}<_components.strong>{"unaspirated"}</_components.strong>{" — no strong puff of air"}</_components.li>{"\n"}<_components.li><_components.strong>{"ào"}</_components.strong>{" sounds like "}<_components.strong>{"\"ow\""}</_components.strong>{" in \"how\", but with a sharp falling tone"}</_components.li>{"\n"}<_components.li><_components.strong>{"gào"}</_components.strong>{" sounds like "}<_components.strong>{"\"gow!\""}</_components.strong>{" with a sharp drop"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"fourth tone"}</_components.strong>{" (ˋ) is a "}<_components.strong>{"sharp falling"}</_components.strong>{" tone:"}</_components.p>{"\n"}<_components.p>{"Say it like you're being decisive or giving a command: "}<_components.strong>{"\"gào!\""}</_components.strong>{" — that's the energy of "}<_components.strong>{"gào"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"告 (gào) - \"tell; inform\""}</_components.li>{"\n"}<_components.li>{"告诉 (gào sù) - \"tell; inform\""}</_components.li>{"\n"}<_components.li>{"告别 (gào bié) - \"say goodbye\""}</_components.li>{"\n"}<_components.li>{"广告 (guǎng gào) - \"advertisement\""}</_components.li>{"\n"}<_components.li>{"报告 (bào gào) - \"report\""}</_components.li>{"\n"}<_components.li>{"忠告 (zhōng gào) - \"advice; warning\""}</_components.li>{"\n"}</_components.ul></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
