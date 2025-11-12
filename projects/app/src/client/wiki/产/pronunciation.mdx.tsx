// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 产 (chǎn)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" chǎn"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Third tone"}</_components.strong>{" — "}<_components.strong>{"falling-rising"}</_components.strong>{" tone, like saying \"uh-huh\" when nodding"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"ch"}</_components.strong>{" like "}<_components.strong>{"\"ch\""}</_components.strong>{" in \"chair\""}</_components.li>{"\n"}<_components.li><_components.strong>{"ǎn"}</_components.strong>{" sounds like "}<_components.strong>{"\"ahn\""}</_components.strong>{", but with third tone → dip down and rise up"}</_components.li>{"\n"}<_components.li><_components.strong>{"chǎn"}</_components.strong>{" sounds like "}<_components.strong>{"\"chahn\""}</_components.strong>{" with a dip-then-rise"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"产 (chǎn) - \"give birth\", \"produce\""}</_components.li>{"\n"}<_components.li>{"生产 (shēng chǎn) - \"produce\", \"manufacture\""}</_components.li>{"\n"}<_components.li>{"产品 (chǎn pǐn) - \"product\""}</_components.li>{"\n"}<_components.li>{"产生 (chǎn shēng) - \"arise\", \"come into being\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"Think of 产 as the thoughtful "}<_components.strong>{"\"chahn\""}</_components.strong>{" sound (third tone) - like pondering the process of\ncreating or producing something!"}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
