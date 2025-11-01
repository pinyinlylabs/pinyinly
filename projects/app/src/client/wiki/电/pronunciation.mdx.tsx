// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 电 (diàn)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" diàn"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Fourth tone"}</_components.strong>{" — sharp "}<_components.strong>{"falling"}</_components.strong>{" tone, like giving a command: "}<_components.strong>{"\"Stop!\""}</_components.strong></_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"d"}</_components.strong>{" like "}<_components.strong>{"\"d\""}</_components.strong>{" in \"do\""}</_components.li>{"\n"}<_components.li><_components.strong>{"iàn"}</_components.strong>{" sounds like "}<_components.strong>{"\"yen\""}</_components.strong>{" in \"yen\", but with fourth tone → sharp falling"}</_components.li>{"\n"}<_components.li><_components.strong>{"diàn"}</_components.strong>{" sounds like "}<_components.strong>{"\"dyen!\""}</_components.strong>{" with a sharp drop"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"电 (diàn) - \"electricity\""}</_components.li>{"\n"}<_components.li>{"电话 (diàn huà) - \"telephone\""}</_components.li>{"\n"}<_components.li>{"电脑 (diàn nǎo) - \"computer\""}</_components.li>{"\n"}<_components.li>{"电视 (diàn shì) - \"television\""}</_components.li>{"\n"}<_components.li>{"电影 (diàn yǐng) - \"movie\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"Fourth tone is like the sharp "}<_components.strong>{"\"Zap!\""}</_components.strong>{" of electricity - your voice "}<_components.strong>{"drops sharply"}</_components.strong>{" throughout\n"}<_components.strong>{"diàn"}</_components.strong>{"."}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
