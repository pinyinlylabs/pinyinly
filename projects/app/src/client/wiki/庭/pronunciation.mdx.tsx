// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 庭 (tíng)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" tíng"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Second tone"}</_components.strong>{" — "}<_components.strong>{"rising"}</_components.strong>{" tone, like asking a question"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"t"}</_components.strong>{" like "}<_components.strong>{"\"t\""}</_components.strong>{" in \"top\" but with a slight puff of air"}</_components.li>{"\n"}<_components.li><_components.strong>{"íng"}</_components.strong>{" sounds like "}<_components.strong>{"\"eeng\""}</_components.strong>{" with second tone → rising pitch"}</_components.li>{"\n"}<_components.li><_components.strong>{"tíng"}</_components.strong>{" sounds like "}<_components.strong>{"\"teeng?\""}</_components.strong>{" with a questioning rise"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"second tone"}</_components.strong>{" (ˊ) is a "}<_components.strong>{"rising"}</_components.strong>{" tone:"}</_components.p>{"\n"}<_components.p>{"Start mid-low and rise up, like when you ask \"Really?\" in surprise. "}<_components.strong>{"tíng"}</_components.strong>{" should have that upward\nquestioning intonation."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"庭院 (tíng yuàn) - \"courtyard\""}</_components.li>{"\n"}<_components.li>{"法庭 (fǎ tíng) - \"court; courtroom\""}</_components.li>{"\n"}<_components.li>{"家庭 (jiā tíng) - \"family; household\""}</_components.li>{"\n"}<_components.li>{"庭审 (tíng shěn) - \"court hearing\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"庭 means \"court\" — imagine asking \"Court?\" with that "}<_components.strong>{"rising intonation"}</_components.strong>{" when you're not sure if\nyou're in the right place!"}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
