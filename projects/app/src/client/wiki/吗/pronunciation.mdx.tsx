// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 吗 (ma)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" ma"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Neutral tone"}</_components.strong>{" — "}<_components.strong>{"light and quick"}</_components.strong>{", unstressed"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"m"}</_components.strong>{" like "}<_components.strong>{"\"m\""}</_components.strong>{" in \"mom\""}</_components.li>{"\n"}<_components.li><_components.strong>{"a"}</_components.strong>{" sounds like "}<_components.strong>{"\"ah\""}</_components.strong>{" but very light and quick"}</_components.li>{"\n"}<_components.li><_components.strong>{"ma"}</_components.strong>{" sounds like a quick "}<_components.strong>{"\"mah\""}</_components.strong></_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"neutral tone"}</_components.strong>{" is "}<_components.strong>{"light and unstressed"}</_components.strong>{" — like a quick afterthought:"}</_components.p>{"\n"}<_components.p>{"Say it lightly and quickly, like adding \"huh?\" to the end of a sentence — that's "}<_components.strong>{"ma"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Special Notes:"}</_components.strong></_components.p>{"\n"}<_components.p>{"吗 (ma) is a "}<_components.strong>{"question particle"}</_components.strong>{" that turns statements into yes/no questions. It's always\npronounced with neutral tone and comes at the end of sentences."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"你好吗？ (nǐ hǎo ma?) - \"How are you?\" / \"Are you well?\""}</_components.li>{"\n"}<_components.li>{"你是学生吗？ (nǐ shì xué shēng ma?) - \"Are you a student?\""}</_components.li>{"\n"}<_components.li>{"这是你的吗？ (zhè shì nǐ de ma?) - \"Is this yours?\""}</_components.li>{"\n"}<_components.li>{"你喜欢吗？ (nǐ xǐ huān ma?) - \"Do you like it?\""}</_components.li>{"\n"}</_components.ul></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
