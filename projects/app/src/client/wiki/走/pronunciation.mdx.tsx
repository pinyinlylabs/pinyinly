// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 走 (zǒu)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" zǒu"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Third tone"}</_components.strong>{" — "}<_components.strong>{"falling-rising"}</_components.strong>{" tone, like saying \"uh-huh\" when nodding"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"z"}</_components.strong>{" like "}<_components.strong>{"\"dz\""}</_components.strong>{" in \"adze\" (voiced consonant)"}</_components.li>{"\n"}<_components.li><_components.strong>{"ǒu"}</_components.strong>{" sounds like "}<_components.strong>{"\"oh\""}</_components.strong>{" in \"so\" but with third tone → dip down and rise up"}</_components.li>{"\n"}<_components.li><_components.strong>{"zǒu"}</_components.strong>{" sounds like "}<_components.strong>{"\"dzoh\""}</_components.strong>{" with a dip-then-rise"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip (Third tone: ˇ)"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"third tone"}</_components.strong>{" is a "}<_components.strong>{"fall–then-rise"}</_components.strong>{" tone:"}</_components.p>{"\n"}<_components.p>{"Say it like you're contemplating movement: "}<_components.strong>{"\"zǒu...\""}</_components.strong>{" — that's the thoughtful tone pattern of\n"}<_components.strong>{"zǒu"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"走 (zǒu) - \"walk; go\""}</_components.li>{"\n"}<_components.li>{"走路 (zǒu lù) - \"walk; go on foot\""}</_components.li>{"\n"}<_components.li>{"走开 (zǒu kāi) - \"go away\""}</_components.li>{"\n"}<_components.li>{"走过 (zǒu guò) - \"walk past; go through\""}</_components.li>{"\n"}</_components.ul></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
