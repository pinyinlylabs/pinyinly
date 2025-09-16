// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 费 (fèi)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" fèi"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Fourth tone"}</_components.strong>{" — sharp "}<_components.strong>{"falling"}</_components.strong>{" tone, like giving a command: "}<_components.strong>{"\"Fay!\""}</_components.strong></_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"f"}</_components.strong>{" like "}<_components.strong>{"\"f\""}</_components.strong>{" in \"fee\""}</_components.li>{"\n"}<_components.li><_components.strong>{"èi"}</_components.strong>{" sounds like "}<_components.strong>{"\"ay\""}</_components.strong>{" in \"hay\" but with a sharp falling tone"}</_components.li>{"\n"}<_components.li><_components.strong>{"fèi"}</_components.strong>{" sounds like "}<_components.strong>{"\"fay!\""}</_components.strong>{" with a decisive drop"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip (Fourth tone: ˋ)"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"fourth tone"}</_components.strong>{" starts "}<_components.strong>{"high"}</_components.strong>{" and drops "}<_components.strong>{"fast"}</_components.strong>{":"}</_components.p>{"\n"}<_components.p>{"Say it like you're announcing a cost: "}<_components.strong>{"\"fèi!\""}</_components.strong>{" — that's the sharp falling tone of "}<_components.strong>{"fèi"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"费用 (fèi yòng) - \"cost; expense\""}</_components.li>{"\n"}<_components.li>{"学费 (xué fèi) - \"tuition fee\""}</_components.li>{"\n"}<_components.li>{"浪费 (làng fèi) - \"waste; squander\""}</_components.li>{"\n"}<_components.li>{"消费 (xiāo fèi) - \"consume; spend\""}</_components.li>{"\n"}</_components.ul></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
