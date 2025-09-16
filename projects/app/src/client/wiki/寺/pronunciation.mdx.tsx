// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 寺 (sì)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" sì"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Fourth tone"}</_components.strong>{" — sharp "}<_components.strong>{"falling"}</_components.strong>{" tone, like giving a command"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"s"}</_components.strong>{" like "}<_components.strong>{"\"s\""}</_components.strong>{" in \"see\""}</_components.li>{"\n"}<_components.li><_components.strong>{"ì"}</_components.strong>{" sounds like "}<_components.strong>{"\"ee\""}</_components.strong>{" in \"see\" but with a sharp falling tone"}</_components.li>{"\n"}<_components.li><_components.strong>{"sì"}</_components.strong>{" sounds like "}<_components.strong>{"\"see!\""}</_components.strong>{" with a sharp drop"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"fourth tone"}</_components.strong>{" (ˋ) is a "}<_components.strong>{"sharp falling"}</_components.strong>{" tone:"}</_components.p>{"\n"}<_components.p>{"Say it like giving a firm command: "}<_components.strong>{"\"sì!\""}</_components.strong>{" — that's the tone pattern of "}<_components.strong>{"sì"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"寺 (sì) - \"temple\""}</_components.li>{"\n"}<_components.li>{"寺庙 (sì miào) - \"temple\""}</_components.li>{"\n"}<_components.li>{"佛寺 (fó sì) - \"Buddhist temple\""}</_components.li>{"\n"}<_components.li>{"古寺 (gǔ sì) - \"ancient temple\""}</_components.li>{"\n"}<_components.li>{"名寺 (míng sì) - \"famous temple\""}</_components.li>{"\n"}</_components.ul></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
