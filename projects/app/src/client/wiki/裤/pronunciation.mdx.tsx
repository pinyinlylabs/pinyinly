// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 裤 (kù)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" kù"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Fourth tone"}</_components.strong>{" — sharp "}<_components.strong>{"falling"}</_components.strong>{" tone, like giving a command"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"k"}</_components.strong>{" like "}<_components.strong>{"\"k\""}</_components.strong>{" in \"key\""}</_components.li>{"\n"}<_components.li><_components.strong>{"ù"}</_components.strong>{" sounds like "}<_components.strong>{"\"oo\""}</_components.strong>{" in \"book\" but with sharp falling tone"}</_components.li>{"\n"}<_components.li><_components.strong>{"kù"}</_components.strong>{" sounds like "}<_components.strong>{"\"koo!\""}</_components.strong>{" with a sharp drop in pitch"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"裤 (kù) - \"trousers; pants\""}</_components.li>{"\n"}<_components.li>{"裤子 (kù zi) - \"trousers; pants\""}</_components.li>{"\n"}<_components.li>{"短裤 (duǎn kù) - \"shorts\""}</_components.li>{"\n"}<_components.li>{"长裤 (cháng kù) - \"long pants\""}</_components.li>{"\n"}<_components.li>{"牛仔裤 (niú zǎi kù) - \"jeans\""}</_components.li>{"\n"}<_components.li>{"运动裤 (yùn dòng kù) - \"sweatpants\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The sharp, decisive fourth tone is like the sound of someone firmly pulling on their pants - it's a\nquick, definitive action!"}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
