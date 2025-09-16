// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 假 (jiǎ)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" jiǎ"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Third tone"}</_components.strong>{" — "}<_components.strong>{"falling-rising"}</_components.strong>{" tone, like saying \"uh-huh\" when nodding"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"j"}</_components.strong>{" like "}<_components.strong>{"\"j\""}</_components.strong>{" in \"jeep\", but with the tongue closer to the hard palate and no puff of air"}</_components.li>{"\n"}<_components.li><_components.strong>{"iǎ"}</_components.strong>{" sounds like "}<_components.strong>{"\"yah\""}</_components.strong>{" but with the third tone → dip down and rise up"}</_components.li>{"\n"}<_components.li><_components.strong>{"jiǎ"}</_components.strong>{" sounds like "}<_components.strong>{"\"jyah\""}</_components.strong>{" with a dip-then-rise"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"third tone"}</_components.strong>{" (ˇ) is a "}<_components.strong>{"fall–then-rise"}</_components.strong>{" tone:"}</_components.p>{"\n"}<_components.p>{"Say it like you're thinking or being thoughtful: "}<_components.strong>{"\"jiǎ...\""}</_components.strong>{" — that's the tone pattern of "}<_components.strong>{"jiǎ"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"假 (jiǎ) - \"false\""}</_components.li>{"\n"}<_components.li>{"假如 (jiǎ rú) - \"if\""}</_components.li>{"\n"}<_components.li>{"假的 (jiǎ de) - \"fake\""}</_components.li>{"\n"}<_components.li>{"真假 (zhēn jiǎ) - \"true or false\""}</_components.li>{"\n"}</_components.ul></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
