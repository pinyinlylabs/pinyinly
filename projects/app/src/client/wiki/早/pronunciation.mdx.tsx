// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 早 (zǎo)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" zǎo"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Third tone"}</_components.strong>{" — "}<_components.strong>{"falling-rising"}</_components.strong>{" tone, like saying \"uh-huh\" when nodding"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"z"}</_components.strong>{" like "}<_components.strong>{"\"ds\""}</_components.strong>{" in \"kids\" — a buzzing sound"}</_components.li>{"\n"}<_components.li><_components.strong>{"ǎo"}</_components.strong>{" sounds like "}<_components.strong>{"\"ow\""}</_components.strong>{" in \"how\", but with third tone → dip down and rise up"}</_components.li>{"\n"}<_components.li><_components.strong>{"zǎo"}</_components.strong>{" sounds like "}<_components.strong>{"\"dzow\""}</_components.strong>{" with a dip-then-rise"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"third tone"}</_components.strong>{" (ˇ) is a "}<_components.strong>{"fall–then-rise"}</_components.strong>{" tone:"}</_components.p>{"\n"}<_components.p>{"Say it like you're thoughtfully acknowledging the morning: "}<_components.strong>{"\"zǎo...\""}</_components.strong>{" — that's the contemplative\ntone pattern of "}<_components.strong>{"zǎo"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"早 (zǎo) - \"morning; early\""}</_components.li>{"\n"}<_components.li>{"早上 (zǎo shang) - \"morning\""}</_components.li>{"\n"}<_components.li>{"早餐 (zǎo cān) - \"breakfast\""}</_components.li>{"\n"}<_components.li>{"早就 (zǎo jiù) - \"already; long ago\""}</_components.li>{"\n"}</_components.ul></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
