// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 亮 (liàng)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" liàng"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Fourth tone"}</_components.strong>{" — sharp "}<_components.strong>{"falling"}</_components.strong>{" tone, like giving a command"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"l"}</_components.strong>{" like "}<_components.strong>{"\"l\""}</_components.strong>{" in \"light\""}</_components.li>{"\n"}<_components.li><_components.strong>{"iàng"}</_components.strong>{" sounds like "}<_components.strong>{"\"yahng\""}</_components.strong>{", but with fourth tone → sharp fall"}</_components.li>{"\n"}<_components.li><_components.strong>{"liàng"}</_components.strong>{" sounds like "}<_components.strong>{"\"lyahng!\""}</_components.strong>{" with a commanding drop"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"亮 (liàng) - \"bright\", \"light\""}</_components.li>{"\n"}<_components.li>{"明亮 (míng liàng) - \"bright\", \"brilliant\""}</_components.li>{"\n"}<_components.li>{"漂亮 (piào liang) - \"beautiful\", \"pretty\""}</_components.li>{"\n"}<_components.li>{"亮度 (liàng dù) - \"brightness\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"亮 means "}<_components.strong>{"bright"}</_components.strong>{" - imagine someone exclaiming "}<_components.strong>{"\"lyahng!\""}</_components.strong>{" (fourth tone) when suddenly seeing a\nbright light!"}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
