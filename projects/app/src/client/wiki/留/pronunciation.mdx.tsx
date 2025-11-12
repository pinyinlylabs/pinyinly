// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 留 (liú)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" liú"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Second tone"}</_components.strong>{" — "}<_components.strong>{"rising"}</_components.strong>{" tone, like asking a question: "}<_components.strong>{"\"What?\""}</_components.strong></_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"l"}</_components.strong>{" like "}<_components.strong>{"\"l\""}</_components.strong>{" in \"love\""}</_components.li>{"\n"}<_components.li><_components.strong>{"iú"}</_components.strong>{" sounds like "}<_components.strong>{"\"yo\""}</_components.strong>{" in \"yo-yo\", but with second tone → rising upward"}</_components.li>{"\n"}<_components.li><_components.strong>{"liú"}</_components.strong>{" sounds like "}<_components.strong>{"\"lyo?\""}</_components.strong>{" with a questioning rise"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"留 (liú) - \"to stay; to remain; to keep\""}</_components.li>{"\n"}<_components.li>{"留下 (liú xià) - \"to leave behind; to stay\""}</_components.li>{"\n"}<_components.li>{"留学 (liú xué) - \"to study abroad\""}</_components.li>{"\n"}<_components.li>{"留学生 (liú xué shēng) - \"international student\""}</_components.li>{"\n"}<_components.li>{"保留 (bǎo liú) - \"to retain; to keep\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"Second tone rises like asking "}<_components.strong>{"\"Stay?\""}</_components.strong>{" - your voice goes "}<_components.strong>{"up"}</_components.strong>{" throughout "}<_components.strong>{"liú"}</_components.strong>{"."}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
