// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 保 (bǎo)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" bǎo"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Third tone"}</_components.strong>{" — "}<_components.strong>{"falling-rising"}</_components.strong>{" tone, like saying \"uh-huh\" when nodding"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"b"}</_components.strong>{" like "}<_components.strong>{"\"b\""}</_components.strong>{" in \"ball\""}</_components.li>{"\n"}<_components.li><_components.strong>{"ǎo"}</_components.strong>{" sounds like "}<_components.strong>{"\"ow\""}</_components.strong>{" in \"cow\", but with third tone → dip down and rise up"}</_components.li>{"\n"}<_components.li><_components.strong>{"bǎo"}</_components.strong>{" sounds like "}<_components.strong>{"\"bow\""}</_components.strong>{" with a dip-then-rise"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"third tone"}</_components.strong>{" (ˇ) is a "}<_components.strong>{"fall–then-rise"}</_components.strong>{" tone:"}</_components.p>{"\n"}<_components.p>{"Say it like you're thinking or being thoughtful: "}<_components.strong>{"\"bǎo...\""}</_components.strong>{" — that's the tone pattern of "}<_components.strong>{"bǎo"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"保 (bǎo) - \"to protect; to ensure; to keep\""}</_components.li>{"\n"}<_components.li>{"保护 (bǎo hù) - \"to protect\""}</_components.li>{"\n"}<_components.li>{"保持 (bǎo chí) - \"to maintain; to keep\""}</_components.li>{"\n"}<_components.li>{"保证 (bǎo zhèng) - \"to guarantee\""}</_components.li>{"\n"}<_components.li>{"保险 (bǎo xiǎn) - \"insurance\""}</_components.li>{"\n"}</_components.ul></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
