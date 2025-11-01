// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 儿 (ér)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" ér"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Second tone"}</_components.strong>{" — "}<_components.strong>{"rising"}</_components.strong>{" tone, like asking a question"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"é"}</_components.strong>{" sounds like "}<_components.strong>{"\"er\""}</_components.strong>{" in \"her\", but with a rising tone"}</_components.li>{"\n"}<_components.li><_components.strong>{"ér"}</_components.strong>{" sounds like "}<_components.strong>{"\"er?\""}</_components.strong>{" with a questioning rise"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"second tone"}</_components.strong>{" (´) is a "}<_components.strong>{"rising"}</_components.strong>{" tone:"}</_components.p>{"\n"}<_components.p>{"Say it like you're asking a question: "}<_components.strong>{"\"ér?\""}</_components.strong>{" — that's the tone pattern of "}<_components.strong>{"ér"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"儿 (ér) - \"son\""}</_components.li>{"\n"}<_components.li>{"儿子 (ér zi) - \"son\""}</_components.li>{"\n"}<_components.li>{"女儿 (nǚ ér) - \"daughter\""}</_components.li>{"\n"}<_components.li>{"小孩儿 (xiǎo hái er) - \"child\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Special Note:"}</_components.strong></_components.p>{"\n"}<_components.p>{"儿 is often used as a suffix (儿化音) in Beijing dialect, where it's pronounced as a light \"r\" sound\nattached to the previous syllable."}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
