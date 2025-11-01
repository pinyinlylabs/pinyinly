// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 赛 (sài)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" sài"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Fourth tone"}</_components.strong>{" — sharp "}<_components.strong>{"falling"}</_components.strong>{" tone, like giving a command: "}<_components.strong>{"\"Sigh!\""}</_components.strong></_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"s"}</_components.strong>{" like "}<_components.strong>{"\"s\""}</_components.strong>{" in \"sit\""}</_components.li>{"\n"}<_components.li><_components.strong>{"ài"}</_components.strong>{" sounds like "}<_components.strong>{"\"eye\""}</_components.strong>{" but with a sharp falling tone"}</_components.li>{"\n"}<_components.li><_components.strong>{"sài"}</_components.strong>{" sounds like "}<_components.strong>{"\"sigh!\""}</_components.strong>{" with a decisive drop"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip (Fourth tone: ˋ)"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"fourth tone"}</_components.strong>{" starts "}<_components.strong>{"high"}</_components.strong>{" and drops "}<_components.strong>{"fast"}</_components.strong>{":"}</_components.p>{"\n"}<_components.p>{"Say it like you're announcing a competition: "}<_components.strong>{"\"sài!\""}</_components.strong>{" — that's the sharp falling tone of "}<_components.strong>{"sài"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"比赛 (bǐ sài) - \"competition; match\""}</_components.li>{"\n"}<_components.li>{"决赛 (jué sài) - \"final; championship\""}</_components.li>{"\n"}<_components.li>{"参赛 (cān sài) - \"participate in a contest\""}</_components.li>{"\n"}<_components.li>{"赛跑 (sài pǎo) - \"race; running competition\""}</_components.li>{"\n"}</_components.ul></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
