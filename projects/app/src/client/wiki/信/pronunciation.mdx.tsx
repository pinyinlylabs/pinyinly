// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 信 (xìn)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" xìn"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Fourth tone"}</_components.strong>{" — sharp "}<_components.strong>{"falling"}</_components.strong>{" tone, like giving a command"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"x"}</_components.strong>{" like "}<_components.strong>{"\"sh\""}</_components.strong>{" in \"she\" (but with tongue tip down)"}</_components.li>{"\n"}<_components.li><_components.strong>{"ìn"}</_components.strong>{" sounds like "}<_components.strong>{"\"een\""}</_components.strong>{" in \"seen\", but with fourth tone → sharp falling"}</_components.li>{"\n"}<_components.li><_components.strong>{"xìn"}</_components.strong>{" sounds like "}<_components.strong>{"\"sheen!\""}</_components.strong>{" with a sharp drop"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"fourth tone"}</_components.strong>{" (`) is a "}<_components.strong>{"sharp falling"}</_components.strong>{" tone:"}</_components.p>{"\n"}<_components.p>{"Say it like giving a firm command: "}<_components.strong>{"\"xìn!\""}</_components.strong>{" — that's the tone pattern of "}<_components.strong>{"xìn"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"信 (xìn) - \"to believe; trust; letter\""}</_components.li>{"\n"}<_components.li>{"相信 (xiāng xìn) - \"to believe\""}</_components.li>{"\n"}<_components.li>{"信任 (xìn rèn) - \"to trust\""}</_components.li>{"\n"}<_components.li>{"信息 (xìn xī) - \"information\""}</_components.li>{"\n"}<_components.li>{"信心 (xìn xīn) - \"confidence\""}</_components.li>{"\n"}</_components.ul></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
