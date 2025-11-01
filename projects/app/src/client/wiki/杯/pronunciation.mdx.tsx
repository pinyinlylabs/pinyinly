// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 杯 (bēi)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" bēi"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: First tone"}</_components.strong>{" — "}<_components.strong>{"high and flat"}</_components.strong>{" tone, like a steady note"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"b"}</_components.strong>{" like "}<_components.strong>{"\"b\""}</_components.strong>{" in \"bay\""}</_components.li>{"\n"}<_components.li><_components.strong>{"ēi"}</_components.strong>{" sounds like "}<_components.strong>{"\"ay\""}</_components.strong>{" in \"bay\", but with first tone → stay high and flat"}</_components.li>{"\n"}<_components.li><_components.strong>{"bēi"}</_components.strong>{" sounds like "}<_components.strong>{"\"bay\""}</_components.strong>{" with a steady high pitch"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"杯 (bēi) - \"cup; glass\""}</_components.li>{"\n"}<_components.li>{"杯子 (bēi zi) - \"cup\""}</_components.li>{"\n"}<_components.li>{"干杯 (gān bēi) - \"cheers!\""}</_components.li>{"\n"}<_components.li>{"一杯茶 (yī bēi chá) - \"a cup of tea\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"A "}<_components.strong>{"cup"}</_components.strong>{" sits steadily on a table — that's the steady first tone of "}<_components.strong>{"bēi"}</_components.strong>{"!"}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
