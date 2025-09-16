// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 后 (hòu)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" hòu"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Fourth tone"}</_components.strong>{" — sharp "}<_components.strong>{"falling"}</_components.strong>{" tone, like giving a command: "}<_components.strong>{"\"Down!\""}</_components.strong></_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"h"}</_components.strong>{" like "}<_components.strong>{"\"h\""}</_components.strong>{" in \"hat\""}</_components.li>{"\n"}<_components.li><_components.strong>{"òu"}</_components.strong>{" sounds like "}<_components.strong>{"\"oh\""}</_components.strong>{" in \"oh no\" but with a sharp falling tone"}</_components.li>{"\n"}<_components.li><_components.strong>{"hòu"}</_components.strong>{" sounds like "}<_components.strong>{"\"hoh!\""}</_components.strong>{" with a sharp drop"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"fourth tone"}</_components.strong>{" (ˋ) starts "}<_components.strong>{"high"}</_components.strong>{" and drops "}<_components.strong>{"fast"}</_components.strong>{":"}</_components.p>{"\n"}<_components.p>{"Say it like you're being decisive or giving a command — that's the energy of "}<_components.strong>{"hòu"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"后面 (hòu miàn) - \"behind, back\""}</_components.li>{"\n"}<_components.li>{"后来 (hòu lái) - \"later, afterwards\""}</_components.li>{"\n"}<_components.li>{"然后 (rán hòu) - \"then, after that\""}</_components.li>{"\n"}<_components.li>{"后天 (hòu tiān) - \"day after tomorrow\""}</_components.li>{"\n"}<_components.li>{"前后 (qián hòu) - \"front and back\""}</_components.li>{"\n"}</_components.ul></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
