// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 文 (wén)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" wén"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Second tone"}</_components.strong>{" — "}<_components.strong>{"rising"}</_components.strong>{" tone, like asking a question"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"w"}</_components.strong>{" like "}<_components.strong>{"\"w\""}</_components.strong>{" in \"way\""}</_components.li>{"\n"}<_components.li><_components.strong>{"én"}</_components.strong>{" sounds like "}<_components.strong>{"\"un\""}</_components.strong>{" in \"fun\", but with a rising tone"}</_components.li>{"\n"}<_components.li><_components.strong>{"wén"}</_components.strong>{" sounds like "}<_components.strong>{"\"wun?\""}</_components.strong>{" with a questioning rise"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"文 (wén) - \"script, writing, culture\""}</_components.li>{"\n"}<_components.li>{"文字 (wén zì) - \"written characters\""}</_components.li>{"\n"}<_components.li>{"文化 (wén huà) - \"culture\""}</_components.li>{"\n"}<_components.li>{"文学 (wén xué) - \"literature\""}</_components.li>{"\n"}<_components.li>{"文件 (wén jiàn) - \"document\""}</_components.li>{"\n"}<_components.li>{"中文 (zhōng wén) - \"Chinese language\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The rising second tone suggests the upward progression of learning and "}<_components.strong>{"culture"}</_components.strong>{" that comes\nthrough "}<_components.strong>{"writing"}</_components.strong>{" and "}<_components.strong>{"script"}</_components.strong>{"."}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
