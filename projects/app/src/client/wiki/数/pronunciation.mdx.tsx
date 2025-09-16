// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 数 (shǔ)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" shǔ"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Third tone"}</_components.strong>{" — "}<_components.strong>{"falling-rising"}</_components.strong>{" tone, like saying \"uh-huh\" when nodding"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"sh"}</_components.strong>{" like "}<_components.strong>{"\"sh\""}</_components.strong>{" in \"shoe\""}</_components.li>{"\n"}<_components.li><_components.strong>{"ǔ"}</_components.strong>{" sounds like "}<_components.strong>{"\"oo\""}</_components.strong>{" in \"good\", but with the "}<_components.strong>{"third tone"}</_components.strong>{" → dip down and rise up"}</_components.li>{"\n"}<_components.li><_components.strong>{"shǔ"}</_components.strong>{" sounds like "}<_components.strong>{"\"shoo\""}</_components.strong>{" with a dip-then-rise"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"数 (shǔ) - \"count\""}</_components.li>{"\n"}<_components.li>{"数字 (shù zì) - \"number, digit\""}</_components.li>{"\n"}<_components.li>{"数学 (shù xué) - \"mathematics\""}</_components.li>{"\n"}<_components.li>{"数量 (shù liàng) - \"quantity\""}</_components.li>{"\n"}<_components.li>{"计数 (jì shǔ) - \"count\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Special Note:"}</_components.strong></_components.p>{"\n"}<_components.p>{"数 has another pronunciation "}<_components.strong>{"shù"}</_components.strong>{" (fourth tone) when used as a noun meaning \"number\" or\n\"mathematics\", but as a verb meaning \"count\", it's "}<_components.strong>{"shǔ"}</_components.strong>{" (third tone)."}</_components.p>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The third tone's rhythm reflects the methodical up-and-down process of "}<_components.strong>{"counting"}</_components.strong>{"."}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
