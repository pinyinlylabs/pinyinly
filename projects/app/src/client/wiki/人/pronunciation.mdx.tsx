// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 人 (rén)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" rén"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Second tone"}</_components.strong>{" — "}<_components.strong>{"rising"}</_components.strong>{" tone, like asking a question"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"r"}</_components.strong>{" like "}<_components.strong>{"\"r\""}</_components.strong>{" in \"red\" (but with tongue tip curled up)"}</_components.li>{"\n"}<_components.li><_components.strong>{"én"}</_components.strong>{" sounds like "}<_components.strong>{"\"en\""}</_components.strong>{" in \"pen\", but with second tone → rising like a question"}</_components.li>{"\n"}<_components.li><_components.strong>{"rén"}</_components.strong>{" sounds like "}<_components.strong>{"\"ren?\""}</_components.strong>{" with a questioning rise"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"人 (rén) - \"person\", \"people\""}</_components.li>{"\n"}<_components.li>{"人们 (rén men) - \"people\""}</_components.li>{"\n"}<_components.li>{"人民 (rén mín) - \"people\", \"citizens\""}</_components.li>{"\n"}<_components.li>{"人类 (rén lèi) - \"humanity\", \"human race\""}</_components.li>{"\n"}<_components.li>{"好人 (hǎo rén) - \"good person\""}</_components.li>{"\n"}<_components.li>{"别人 (bié rén) - \"other people\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"人 means "}<_components.strong>{"person"}</_components.strong>{" - say "}<_components.strong>{"\"ren?\""}</_components.strong>{" with a curious, rising tone (second tone), like asking\n\"person?\" when meeting someone new!"}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
