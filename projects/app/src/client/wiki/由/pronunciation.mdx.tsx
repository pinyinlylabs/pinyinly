// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 由 (yóu)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" yóu"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Second tone"}</_components.strong>{" — "}<_components.strong>{"rising"}</_components.strong>{" tone, like asking a question: "}<_components.strong>{"\"What?\""}</_components.strong></_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"y"}</_components.strong>{" like "}<_components.strong>{"\"y\""}</_components.strong>{" in \"yes\""}</_components.li>{"\n"}<_components.li><_components.strong>{"óu"}</_components.strong>{" sounds like "}<_components.strong>{"\"o\""}</_components.strong>{" in \"so\", but with second tone → rising upward"}</_components.li>{"\n"}<_components.li><_components.strong>{"yóu"}</_components.strong>{" sounds like "}<_components.strong>{"\"yo?\""}</_components.strong>{" with a questioning rise"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"由 (yóu) - \"from; by; cause\""}</_components.li>{"\n"}<_components.li>{"由于 (yóu yú) - \"due to; because of\""}</_components.li>{"\n"}<_components.li>{"自由 (zì yóu) - \"freedom\""}</_components.li>{"\n"}<_components.li>{"理由 (lǐ yóu) - \"reason\""}</_components.li>{"\n"}<_components.li>{"由来 (yóu lái) - \"origin; source\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"Second tone rises like asking "}<_components.strong>{"\"From where?\""}</_components.strong>{" - your voice goes "}<_components.strong>{"up"}</_components.strong>{" throughout "}<_components.strong>{"yóu"}</_components.strong>{"."}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
