// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 晚 (wǎn)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" wǎn"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Third tone"}</_components.strong>{" — "}<_components.strong>{"falling-rising"}</_components.strong>{" tone, like saying \"uh-huh\" when nodding"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"w"}</_components.strong>{" like "}<_components.strong>{"\"w\""}</_components.strong>{" in \"way\""}</_components.li>{"\n"}<_components.li><_components.strong>{"ǎn"}</_components.strong>{" sounds like "}<_components.strong>{"\"an\""}</_components.strong>{" in \"can\" but with third tone → dip down and rise up"}</_components.li>{"\n"}<_components.li><_components.strong>{"wǎn"}</_components.strong>{" sounds like "}<_components.strong>{"\"wan\""}</_components.strong>{" with a dip-then-rise"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"third tone"}</_components.strong>{" (ˇ) is a "}<_components.strong>{"fall–then-rise"}</_components.strong>{" tone:"}</_components.p>{"\n"}<_components.p>{"Say it like you're thoughtfully acknowledging the evening: "}<_components.strong>{"\"wǎn...\""}</_components.strong>{" — that's the contemplative\ntone pattern of "}<_components.strong>{"wǎn"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"晚 (wǎn) - \"evening; late\""}</_components.li>{"\n"}<_components.li>{"晚上 (wǎn shang) - \"evening\""}</_components.li>{"\n"}<_components.li>{"晚餐 (wǎn cān) - \"dinner\""}</_components.li>{"\n"}<_components.li>{"晚安 (wǎn ān) - \"good night\""}</_components.li>{"\n"}</_components.ul></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
