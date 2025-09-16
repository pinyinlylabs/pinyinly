// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 责 (zé)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" zé"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Second tone"}</_components.strong>{" — "}<_components.strong>{"rising"}</_components.strong>{" tone, like asking a question: "}<_components.strong>{"\"Zay?\""}</_components.strong></_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"z"}</_components.strong>{" like "}<_components.strong>{"\"dz\""}</_components.strong>{" in \"adze\" (voiced consonant)"}</_components.li>{"\n"}<_components.li><_components.strong>{"é"}</_components.strong>{" sounds like "}<_components.strong>{"\"ay\""}</_components.strong>{" in \"hay\" with a rising tone"}</_components.li>{"\n"}<_components.li><_components.strong>{"zé"}</_components.strong>{" sounds like "}<_components.strong>{"\"dzay?\""}</_components.strong>{" with a questioning rise"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip (Second tone: ˊ)"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"second tone"}</_components.strong>{" is "}<_components.strong>{"rising"}</_components.strong>{", like the end of a question:"}</_components.p>{"\n"}<_components.p>{"Say it like you're asking \"really?\": "}<_components.strong>{"\"zé?\""}</_components.strong>{" — that's the rising tone pattern of "}<_components.strong>{"zé"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"责任 (zé rèn) - \"responsibility\""}</_components.li>{"\n"}<_components.li>{"负责 (fù zé) - \"responsible; in charge\""}</_components.li>{"\n"}<_components.li>{"责备 (zé bèi) - \"blame; reproach\""}</_components.li>{"\n"}<_components.li>{"职责 (zhí zé) - \"duty; responsibility\""}</_components.li>{"\n"}</_components.ul></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
