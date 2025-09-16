// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 韦 (wéi)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" wéi"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Second tone"}</_components.strong>{" — "}<_components.strong>{"rising"}</_components.strong>{" tone, like asking a question"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"w"}</_components.strong>{" like "}<_components.strong>{"\"w\""}</_components.strong>{" in \"way\""}</_components.li>{"\n"}<_components.li><_components.strong>{"éi"}</_components.strong>{" sounds like "}<_components.strong>{"\"way\""}</_components.strong>{" but with rising tone"}</_components.li>{"\n"}<_components.li><_components.strong>{"wéi"}</_components.strong>{" sounds like "}<_components.strong>{"\"way?\""}</_components.strong>{" with a questioning rise"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"second tone"}</_components.strong>{" (´) is a "}<_components.strong>{"rising"}</_components.strong>{" tone, like when you ask \"Which way?\" Say "}<_components.strong>{"\"wéi\""}</_components.strong>{" with a\ncurious, upward inflection."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"韦 (wéi) - \"tanned leather\""}</_components.li>{"\n"}<_components.li>{"韦编三绝 (wéi biān sān jué) - classical expression about studying diligently"}</_components.li>{"\n"}<_components.li>{"Used mainly in traditional contexts and compounds"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"韦 is an ancient character related to leather working — imagine asking \"What "}<_components.strong>{"way"}</_components.strong>{" do we tan this\nleather?\" with a rising tone!"}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
