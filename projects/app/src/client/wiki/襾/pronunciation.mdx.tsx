// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 襾 (yà)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" yà"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Fourth tone"}</_components.strong>{" — sharp "}<_components.strong>{"falling"}</_components.strong>{" tone, like giving a command"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"y"}</_components.strong>{" like "}<_components.strong>{"\"y\""}</_components.strong>{" in \"yes\""}</_components.li>{"\n"}<_components.li><_components.strong>{"à"}</_components.strong>{" sounds like "}<_components.strong>{"\"ah\""}</_components.strong>{" but with sharp falling tone"}</_components.li>{"\n"}<_components.li><_components.strong>{"yà"}</_components.strong>{" sounds like "}<_components.strong>{"\"yah!\""}</_components.strong>{" with a sharp drop in pitch"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"襾 (yà) - \"cover; radical meaning 'cover'\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"📝 Note on Usage:"}</_components.strong></_components.p>{"\n"}<_components.p>{"襾 is primarily used as a radical component in other Chinese characters rather than as a standalone\nword. It appears in characters like:"}</_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"要 (yào) - \"want; need\""}</_components.li>{"\n"}<_components.li>{"覆 (fù) - \"cover; overturn\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p>{"As a radical, it represents the concept of \"covering\" or \"protection from above.\""}</_components.p>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The sharp falling fourth tone mimics the action of something falling down to cover - like a blanket\ndropping sharply to cover you!"}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
