// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 起 (qǐ)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" qǐ"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Third tone"}</_components.strong>{" — "}<_components.strong>{"falling-rising"}</_components.strong>{" tone, like saying \"uh-huh\" when nodding"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"q"}</_components.strong>{" like "}<_components.strong>{"\"ch\""}</_components.strong>{" in \"cheese\" but with more air (aspirated)"}</_components.li>{"\n"}<_components.li><_components.strong>{"ǐ"}</_components.strong>{" sounds like "}<_components.strong>{"\"ee\""}</_components.strong>{" in \"see\" but with third tone → dip down and rise up"}</_components.li>{"\n"}<_components.li><_components.strong>{"qǐ"}</_components.strong>{" sounds like "}<_components.strong>{"\"chee\""}</_components.strong>{" with a dip-then-rise"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip (Third tone: ˇ)"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"third tone"}</_components.strong>{" is a "}<_components.strong>{"fall–then-rise"}</_components.strong>{" tone:"}</_components.p>{"\n"}<_components.p>{"Say it like you're asking someone to get up: "}<_components.strong>{"\"qǐ...\""}</_components.strong>{" — that's the contemplative tone pattern of\n"}<_components.strong>{"qǐ"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"起床 (qǐ chuáng) - \"get up; get out of bed\""}</_components.li>{"\n"}<_components.li>{"起来 (qǐ lái) - \"get up; stand up\""}</_components.li>{"\n"}<_components.li>{"起飞 (qǐ fēi) - \"take off (airplane)\""}</_components.li>{"\n"}<_components.li>{"一起 (yì qǐ) - \"together\""}</_components.li>{"\n"}</_components.ul></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
