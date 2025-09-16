// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 面 (miàn)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" miàn"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Fourth tone"}</_components.strong>{" — sharp "}<_components.strong>{"falling"}</_components.strong>{" tone, like giving a command"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"m"}</_components.strong>{" like "}<_components.strong>{"\"m\""}</_components.strong>{" in \"moon\""}</_components.li>{"\n"}<_components.li><_components.strong>{"iàn"}</_components.strong>{" sounds like "}<_components.strong>{"\"yen\""}</_components.strong>{" in Japanese yen, but with fourth tone → sharp falling"}</_components.li>{"\n"}<_components.li><_components.strong>{"miàn"}</_components.strong>{" sounds like "}<_components.strong>{"\"myen!\""}</_components.strong>{" with a sharp drop"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"面 (miàn) - \"face; surface\""}</_components.li>{"\n"}<_components.li>{"见面 (jiàn miàn) - \"meet; see each other\""}</_components.li>{"\n"}<_components.li>{"面包 (miàn bāo) - \"bread\""}</_components.li>{"\n"}<_components.li>{"面条 (miàn tiáo) - \"noodles\""}</_components.li>{"\n"}<_components.li>{"表面 (biǎo miàn) - \"surface; appearance\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"sharp falling tone"}</_components.strong>{" is like looking directly at someone's face with focus — "}<_components.strong>{"miàn"}</_components.strong></_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
