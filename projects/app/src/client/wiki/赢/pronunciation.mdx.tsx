// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 赢 (yíng)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" yíng"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Second tone"}</_components.strong>{" — "}<_components.strong>{"rising"}</_components.strong>{" tone, like asking a question: "}<_components.strong>{"\"Ying?\""}</_components.strong></_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"y"}</_components.strong>{" like "}<_components.strong>{"\"y\""}</_components.strong>{" in \"yes\""}</_components.li>{"\n"}<_components.li><_components.strong>{"íng"}</_components.strong>{" sounds like "}<_components.strong>{"\"ing\""}</_components.strong>{" in \"sing\" but with a rising tone"}</_components.li>{"\n"}<_components.li><_components.strong>{"yíng"}</_components.strong>{" sounds like "}<_components.strong>{"\"ying?\""}</_components.strong>{" with a questioning rise"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip (Second tone: ˊ)"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"second tone"}</_components.strong>{" is "}<_components.strong>{"rising"}</_components.strong>{", like the end of a question:"}</_components.p>{"\n"}<_components.p>{"Say it like you're asking \"we won?\": "}<_components.strong>{"\"yíng?\""}</_components.strong>{" — that's the rising tone pattern of "}<_components.strong>{"yíng"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"赢 (yíng) - \"win; gain\""}</_components.li>{"\n"}<_components.li>{"赢得 (yíng dé) - \"win; gain; earn\""}</_components.li>{"\n"}<_components.li>{"输赢 (shū yíng) - \"win or lose\""}</_components.li>{"\n"}<_components.li>{"双赢 (shuāng yíng) - \"win-win\""}</_components.li>{"\n"}</_components.ul></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
