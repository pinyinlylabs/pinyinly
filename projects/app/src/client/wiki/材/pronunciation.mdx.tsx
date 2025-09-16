// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 材 (cái)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" cái"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Second tone"}</_components.strong>{" — "}<_components.strong>{"rising"}</_components.strong>{" tone, like asking a question"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"c"}</_components.strong>{" like "}<_components.strong>{"\"ts\""}</_components.strong>{" in \"cats\""}</_components.li>{"\n"}<_components.li><_components.strong>{"ái"}</_components.strong>{" sounds like "}<_components.strong>{"\"eye\""}</_components.strong>{", but with second tone → rise up"}</_components.li>{"\n"}<_components.li><_components.strong>{"cái"}</_components.strong>{" sounds like "}<_components.strong>{"\"tsai\""}</_components.strong>{" with a rising tone"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"材 (cái) - \"material\""}</_components.li>{"\n"}<_components.li>{"材料 (cái liào) - \"materials\""}</_components.li>{"\n"}<_components.li>{"教材 (jiào cái) - \"textbook\""}</_components.li>{"\n"}<_components.li>{"人材 (rén cái) - \"talent\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"Think of "}<_components.strong>{"material"}</_components.strong>{" going "}<_components.strong>{"up"}</_components.strong>{" in value — that's the rising second tone of "}<_components.strong>{"cái"}</_components.strong>{"!"}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
