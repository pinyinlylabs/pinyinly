// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 我 (wǒ)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" wǒ"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Third tone"}</_components.strong>{" — "}<_components.strong>{"falling-rising"}</_components.strong>{" tone, like saying \"uh-huh\" when nodding"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"w"}</_components.strong>{" like "}<_components.strong>{"\"w\""}</_components.strong>{" in \"way\""}</_components.li>{"\n"}<_components.li><_components.strong>{"ǒ"}</_components.strong>{" sounds like "}<_components.strong>{"\"oh\""}</_components.strong>{" but with third tone → dip down and rise up"}</_components.li>{"\n"}<_components.li><_components.strong>{"wǒ"}</_components.strong>{" sounds like "}<_components.strong>{"\"whoa\""}</_components.strong>{" with a dip-then-rise"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"third tone"}</_components.strong>{" (ˇ) is a "}<_components.strong>{"fall–then-rise"}</_components.strong>{" tone:"}</_components.p>{"\n"}<_components.p>{"Say it like you're pointing to yourself thoughtfully: "}<_components.strong>{"\"wǒ...\""}</_components.strong>{" — that's the contemplative tone\npattern of "}<_components.strong>{"wǒ"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"我 (wǒ) - \"I; me\""}</_components.li>{"\n"}<_components.li>{"我们 (wǒ men) - \"we; us\""}</_components.li>{"\n"}<_components.li>{"我的 (wǒ de) - \"my; mine\""}</_components.li>{"\n"}<_components.li>{"我是 (wǒ shì) - \"I am\""}</_components.li>{"\n"}<_components.li>{"我叫 (wǒ jiào) - \"my name is\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p><_components.strong>{"I"}</_components.strong>{" — the dipping third tone is like pointing to yourself with emphasis!"}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
