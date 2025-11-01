// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 例 (lì)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" lì"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Fourth tone"}</_components.strong>{" — sharp "}<_components.strong>{"falling"}</_components.strong>{" tone, like giving a command"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"l"}</_components.strong>{" like "}<_components.strong>{"\"l\""}</_components.strong>{" in \"like\""}</_components.li>{"\n"}<_components.li><_components.strong>{"ì"}</_components.strong>{" sounds like "}<_components.strong>{"\"ee\""}</_components.strong>{" in \"see\", but with fourth tone → sharp falling"}</_components.li>{"\n"}<_components.li><_components.strong>{"lì"}</_components.strong>{" sounds like "}<_components.strong>{"\"lee!\""}</_components.strong>{" with a sharp drop"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"fourth tone"}</_components.strong>{" (`) is a "}<_components.strong>{"sharp falling"}</_components.strong>{" tone:"}</_components.p>{"\n"}<_components.p>{"Say it like giving a firm command: "}<_components.strong>{"\"lì!\""}</_components.strong>{" — that's the tone pattern of "}<_components.strong>{"lì"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"例 (lì) - \"example; instance\""}</_components.li>{"\n"}<_components.li>{"例如 (lì rú) - \"for example; such as\""}</_components.li>{"\n"}<_components.li>{"例子 (lì zi) - \"example; case\""}</_components.li>{"\n"}<_components.li>{"举例 (jǔ lì) - \"to give an example\""}</_components.li>{"\n"}<_components.li>{"病例 (bìng lì) - \"medical case\""}</_components.li>{"\n"}</_components.ul></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
