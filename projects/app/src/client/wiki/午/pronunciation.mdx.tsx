// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 午 (wǔ)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" wǔ"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Third tone"}</_components.strong>{" — "}<_components.strong>{"falling-rising"}</_components.strong>{" tone, like saying \"uh-huh\" when nodding"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"w"}</_components.strong>{" like "}<_components.strong>{"\"w\""}</_components.strong>{" in \"way\""}</_components.li>{"\n"}<_components.li><_components.strong>{"ǔ"}</_components.strong>{" sounds like "}<_components.strong>{"\"oo\""}</_components.strong>{" in \"book\", but with the "}<_components.strong>{"third tone"}</_components.strong>{" → dip down and rise up"}</_components.li>{"\n"}<_components.li><_components.strong>{"wǔ"}</_components.strong>{" sounds like "}<_components.strong>{"\"woo\""}</_components.strong>{" with a dip-then-rise"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"third tone"}</_components.strong>{" (ˇ) is a "}<_components.strong>{"fall–then-rise"}</_components.strong>{" tone:"}</_components.p>{"\n"}<_components.p>{"Say it like you're drowsily thinking about lunch: "}<_components.strong>{"\"wǔ...\""}</_components.strong>{" — that contemplative, mid-day tone."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"午 (wǔ) - \"noon\""}</_components.li>{"\n"}<_components.li>{"中午 (zhōng wǔ) - \"noon; midday\""}</_components.li>{"\n"}<_components.li>{"上午 (shàng wǔ) - \"morning\""}</_components.li>{"\n"}<_components.li>{"下午 (xià wǔ) - \"afternoon\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"午 means \"noon\" — the dipping third tone is like the sun reaching its peak and then starting to\ndescend!"}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
