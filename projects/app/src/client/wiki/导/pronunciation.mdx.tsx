// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 导 (dǎo)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" dǎo"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Third tone"}</_components.strong>{" — "}<_components.strong>{"falling-rising"}</_components.strong>{" tone, like saying \"uh-huh\" when nodding"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"d"}</_components.strong>{" like "}<_components.strong>{"\"d\""}</_components.strong>{" in \"dog\""}</_components.li>{"\n"}<_components.li><_components.strong>{"ǎo"}</_components.strong>{" sounds like "}<_components.strong>{"\"ow\""}</_components.strong>{" in \"how\" but with third tone → dip down and rise up"}</_components.li>{"\n"}<_components.li><_components.strong>{"dǎo"}</_components.strong>{" sounds like "}<_components.strong>{"\"dow\""}</_components.strong>{" with a dip-then-rise"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"third tone"}</_components.strong>{" (ˇ) is a "}<_components.strong>{"fall–then-rise"}</_components.strong>{" tone:"}</_components.p>{"\n"}<_components.p>{"Say it like you're thinking or being thoughtful: "}<_components.strong>{"\"dǎo...\""}</_components.strong>{" — that's the tone pattern of "}<_components.strong>{"dǎo"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"导 (dǎo) - \"direct\""}</_components.li>{"\n"}<_components.li>{"导演 (dǎo yǎn) - \"director\""}</_components.li>{"\n"}<_components.li>{"指导 (zhǐ dǎo) - \"guide\""}</_components.li>{"\n"}<_components.li>{"领导 (lǐng dǎo) - \"leader\""}</_components.li>{"\n"}<_components.li>{"导师 (dǎo shī) - \"mentor\""}</_components.li>{"\n"}</_components.ul></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
