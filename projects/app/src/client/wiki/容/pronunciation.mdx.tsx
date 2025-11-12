// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 容 (róng)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" róng"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Second tone"}</_components.strong>{" — "}<_components.strong>{"rising"}</_components.strong>{" tone, like asking a question"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"r"}</_components.strong>{" like "}<_components.strong>{"\"r\""}</_components.strong>{" in \"rang\" but softer"}</_components.li>{"\n"}<_components.li><_components.strong>{"óng"}</_components.strong>{" sounds like "}<_components.strong>{"\"ong\""}</_components.strong>{" in \"gong\" but with a rising tone"}</_components.li>{"\n"}<_components.li><_components.strong>{"róng"}</_components.strong>{" sounds like "}<_components.strong>{"\"rong\""}</_components.strong>{" with a questioning rise"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"second tone"}</_components.strong>{" (ˊ) is a "}<_components.strong>{"rising"}</_components.strong>{" tone:"}</_components.p>{"\n"}<_components.p>{"Say it like you're asking a question: "}<_components.strong>{"\"róng?\""}</_components.strong>{" — that's the tone pattern of "}<_components.strong>{"róng"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"容 (róng) - \"contain\""}</_components.li>{"\n"}<_components.li>{"容易 (róng yì) - \"easy\""}</_components.li>{"\n"}<_components.li>{"内容 (nèi róng) - \"content\""}</_components.li>{"\n"}<_components.li>{"容器 (róng qì) - \"container\""}</_components.li>{"\n"}<_components.li>{"容忍 (róng rěn) - \"tolerate\""}</_components.li>{"\n"}</_components.ul></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
