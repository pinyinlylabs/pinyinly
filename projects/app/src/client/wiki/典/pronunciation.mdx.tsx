// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 典 (diǎn)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" diǎn"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Third tone"}</_components.strong>{" — "}<_components.strong>{"falling-rising"}</_components.strong>{" tone, like saying \"uh-huh\" when nodding"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"d"}</_components.strong>{" like "}<_components.strong>{"\"d\""}</_components.strong>{" in \"day\""}</_components.li>{"\n"}<_components.li><_components.strong>{"iǎn"}</_components.strong>{" sounds like "}<_components.strong>{"\"yen\""}</_components.strong>{" but with the "}<_components.strong>{"third tone"}</_components.strong>{" → dip down and rise up"}</_components.li>{"\n"}<_components.li><_components.strong>{"diǎn"}</_components.strong>{" sounds like "}<_components.strong>{"\"d-yen\""}</_components.strong>{" with a dip-then-rise"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"third tone"}</_components.strong>{" (ˇ) is a "}<_components.strong>{"fall–then-rise"}</_components.strong>{" tone:"}</_components.p>{"\n"}<_components.p>{"Say it like you're being thoughtful or considering something: "}<_components.strong>{"\"diǎn...\""}</_components.strong>{" — that's the tone\npattern."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"典 (diǎn) - \"document; classic\""}</_components.li>{"\n"}<_components.li>{"典型 (diǎn xíng) - \"typical\""}</_components.li>{"\n"}<_components.li>{"字典 (zì diǎn) - \"dictionary\""}</_components.li>{"\n"}<_components.li>{"经典 (jīng diǎn) - \"classic\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"Think of flipping through pages of a classic document — your voice \"dips and rises\" like turning\npages!"}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
