// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 用 (yòng)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" yòng"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Fourth tone"}</_components.strong>{" — sharp "}<_components.strong>{"falling"}</_components.strong>{" tone, like giving a command: "}<_components.strong>{"\"Stop!\""}</_components.strong></_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"y"}</_components.strong>{" like "}<_components.strong>{"\"y\""}</_components.strong>{" in \"yes\""}</_components.li>{"\n"}<_components.li><_components.strong>{"òng"}</_components.strong>{" sounds like "}<_components.strong>{"\"ong\""}</_components.strong>{" in \"song\", but with fourth tone → sharp falling"}</_components.li>{"\n"}<_components.li><_components.strong>{"yòng"}</_components.strong>{" sounds like "}<_components.strong>{"\"yong!\""}</_components.strong>{" with a sharp drop"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"用 (yòng) - \"to use\""}</_components.li>{"\n"}<_components.li>{"用法 (yòng fǎ) - \"usage; method\""}</_components.li>{"\n"}<_components.li>{"用心 (yòng xīn) - \"to be attentive\""}</_components.li>{"\n"}<_components.li>{"不用 (bù yòng) - \"no need; don't have to\""}</_components.li>{"\n"}<_components.li>{"常用 (cháng yòng) - \"commonly used\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"Fourth tone is like commanding someone to "}<_components.strong>{"\"Use!\""}</_components.strong>{" - your voice "}<_components.strong>{"drops sharply"}</_components.strong>{" throughout\n"}<_components.strong>{"yòng"}</_components.strong>{"."}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
