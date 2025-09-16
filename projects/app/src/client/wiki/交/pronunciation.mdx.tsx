// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 交 (jiāo)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" jiāo"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: First tone"}</_components.strong>{" — "}<_components.strong>{"high and flat"}</_components.strong>{" tone, like a steady note: "}<_components.strong>{"\"Eeee\""}</_components.strong></_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"j"}</_components.strong>{" like "}<_components.strong>{"\"j\""}</_components.strong>{" in \"jar\""}</_components.li>{"\n"}<_components.li><_components.strong>{"iāo"}</_components.strong>{" sounds like "}<_components.strong>{"\"yow\""}</_components.strong>{" in \"yowl\", but with first tone → steady and high"}</_components.li>{"\n"}<_components.li><_components.strong>{"jiāo"}</_components.strong>{" sounds like "}<_components.strong>{"\"jyow\""}</_components.strong>{" with a steady high pitch"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"交 (jiāo) - \"hand over\""}</_components.li>{"\n"}<_components.li>{"交朋友 (jiāo péng yǒu) - \"make friends\""}</_components.li>{"\n"}<_components.li>{"交通 (jiāo tōng) - \"traffic\""}</_components.li>{"\n"}<_components.li>{"交流 (jiāo liú) - \"exchange\""}</_components.li>{"\n"}<_components.li>{"交给 (jiāo gěi) - \"hand over to\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"Think of 交 as "}<_components.strong>{"\"jyow\""}</_components.strong>{" said with authority and confidence (first tone) - like when you\nconfidently hand something over to someone!"}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
