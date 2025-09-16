// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 改 (gǎi)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" gǎi"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Third tone"}</_components.strong>{" — "}<_components.strong>{"falling-rising"}</_components.strong>{" tone, like saying \"uh-huh\" when nodding"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"g"}</_components.strong>{" like "}<_components.strong>{"\"g\""}</_components.strong>{" in \"go\""}</_components.li>{"\n"}<_components.li><_components.strong>{"ǎi"}</_components.strong>{" sounds like "}<_components.strong>{"\"eye\""}</_components.strong>{", but with the "}<_components.strong>{"third tone"}</_components.strong>{" → dip down and rise up"}</_components.li>{"\n"}<_components.li><_components.strong>{"gǎi"}</_components.strong>{" sounds like "}<_components.strong>{"\"guy\""}</_components.strong>{" with a dip-then-rise"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"改 (gǎi) - \"change\""}</_components.li>{"\n"}<_components.li>{"改变 (gǎi biàn) - \"change, alter\""}</_components.li>{"\n"}<_components.li>{"改进 (gǎi jìn) - \"improve\""}</_components.li>{"\n"}<_components.li>{"改正 (gǎi zhèng) - \"correct\""}</_components.li>{"\n"}<_components.li>{"改革 (gǎi gé) - \"reform\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The third tone's dip-and-rise pattern mirrors the concept of "}<_components.strong>{"改"}</_components.strong>{" - going down (the old way) then\nrising up (the new way)."}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
