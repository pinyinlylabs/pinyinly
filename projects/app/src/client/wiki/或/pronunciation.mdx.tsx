// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 或 (huò)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" huò"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Fourth tone"}</_components.strong>{" — sharp "}<_components.strong>{"falling"}</_components.strong>{" tone, like giving a command"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"h"}</_components.strong>{" like "}<_components.strong>{"\"h\""}</_components.strong>{" in \"hat\""}</_components.li>{"\n"}<_components.li><_components.strong>{"uò"}</_components.strong>{" sounds like "}<_components.strong>{"\"woh\""}</_components.strong>{" but with fourth tone → sharp falling"}</_components.li>{"\n"}<_components.li><_components.strong>{"huò"}</_components.strong>{" sounds like "}<_components.strong>{"\"hwoh!\""}</_components.strong>{" with a sharp drop"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"fourth tone"}</_components.strong>{" (`) is a "}<_components.strong>{"sharp falling"}</_components.strong>{" tone:"}</_components.p>{"\n"}<_components.p>{"Say it like presenting an option decisively: "}<_components.strong>{"\"huò!\""}</_components.strong>{" — that's the definitive tone pattern of\n"}<_components.strong>{"huò"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"或 (huò) - \"or; perhaps\""}</_components.li>{"\n"}<_components.li>{"或者 (huò zhě) - \"or; either... or\""}</_components.li>{"\n"}<_components.li>{"或许 (huò xǔ) - \"perhaps; maybe\""}</_components.li>{"\n"}<_components.li>{"或是 (huò shì) - \"or; either\""}</_components.li>{"\n"}<_components.li>{"生或死 (shēng huò sǐ) - \"life or death\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p><_components.strong>{"Or"}</_components.strong>{" — the sharp fourth tone cuts between options like making a decisive choice!"}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
