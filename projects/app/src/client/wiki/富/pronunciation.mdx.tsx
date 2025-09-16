// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 富 (fù)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" fù"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Fourth tone"}</_components.strong>{" — sharp "}<_components.strong>{"falling"}</_components.strong>{" tone, like giving a command"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"f"}</_components.strong>{" like "}<_components.strong>{"\"f\""}</_components.strong>{" in \"fun\""}</_components.li>{"\n"}<_components.li><_components.strong>{"ù"}</_components.strong>{" sounds like "}<_components.strong>{"\"oo\""}</_components.strong>{" in \"book\" but with a sharp falling tone"}</_components.li>{"\n"}<_components.li><_components.strong>{"fù"}</_components.strong>{" sounds like "}<_components.strong>{"\"foo!\""}</_components.strong>{" with a sharp drop"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"fourth tone"}</_components.strong>{" (ˋ) is a "}<_components.strong>{"sharp falling"}</_components.strong>{" tone:"}</_components.p>{"\n"}<_components.p>{"Say it like giving a firm command: "}<_components.strong>{"\"fù!\""}</_components.strong>{" — that's the tone pattern of "}<_components.strong>{"fù"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"富 (fù) - \"rich\""}</_components.li>{"\n"}<_components.li>{"富人 (fù rén) - \"rich person\""}</_components.li>{"\n"}<_components.li>{"富有 (fù yǒu) - \"wealthy\""}</_components.li>{"\n"}<_components.li>{"丰富 (fēng fù) - \"abundant\""}</_components.li>{"\n"}<_components.li>{"财富 (cái fù) - \"wealth\""}</_components.li>{"\n"}</_components.ul></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
