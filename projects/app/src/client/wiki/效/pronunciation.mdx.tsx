// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 效 (xiào)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" xiào"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Fourth tone"}</_components.strong>{" — sharp "}<_components.strong>{"falling"}</_components.strong>{" tone, like giving a command"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"x"}</_components.strong>{" like "}<_components.strong>{"\"sh\""}</_components.strong>{" in \"she\" (but more like a soft \"hs\" sound)"}</_components.li>{"\n"}<_components.li><_components.strong>{"iào"}</_components.strong>{" sounds like "}<_components.strong>{"\"ee-ow\""}</_components.strong>{", but with a sharp falling tone"}</_components.li>{"\n"}<_components.li><_components.strong>{"xiào"}</_components.strong>{" sounds like "}<_components.strong>{"\"shee-ow!\""}</_components.strong>{" with a sharp drop"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"效 (xiào) - \"result, effect\""}</_components.li>{"\n"}<_components.li>{"效果 (xiào guǒ) - \"effect, result\""}</_components.li>{"\n"}<_components.li>{"有效 (yǒu xiào) - \"effective\""}</_components.li>{"\n"}<_components.li>{"效力 (xiào lì) - \"effectiveness\""}</_components.li>{"\n"}<_components.li>{"模仿 (mó fǎng) + 效 → 效仿 (xiào fǎng) - \"imitate\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The sharp fourth tone emphasizes the decisive nature of achieving a "}<_components.strong>{"result"}</_components.strong>{" or "}<_components.strong>{"effect"}</_components.strong>{"."}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
