// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 小 (xiǎo)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" xiǎo"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Third tone"}</_components.strong>{" — "}<_components.strong>{"falling-rising"}</_components.strong>{" tone, like saying \"uh-huh\" when nodding"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"x"}</_components.strong>{" like a soft "}<_components.strong>{"\"sh\""}</_components.strong>{" sound, but your tongue is much closer to your teeth"}</_components.li>{"\n"}<_components.li><_components.strong>{"iǎo"}</_components.strong>{" sounds like "}<_components.strong>{"\"yow\""}</_components.strong>{" in \"yowl\" but with third tone → dip down and rise up"}</_components.li>{"\n"}<_components.li><_components.strong>{"xiǎo"}</_components.strong>{" sounds like "}<_components.strong>{"\"shyow\""}</_components.strong>{" with a dip-then-rise"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"third tone"}</_components.strong>{" (ˇ) is a "}<_components.strong>{"fall–then-rise"}</_components.strong>{" tone:"}</_components.p>{"\n"}<_components.p>{"Say it like you're thinking or being thoughtful: "}<_components.strong>{"\"xiǎo...\""}</_components.strong>{" — that's the tone pattern of\n"}<_components.strong>{"xiǎo"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"小 (xiǎo) - \"small\""}</_components.li>{"\n"}<_components.li>{"小孩 (xiǎo hái) - \"child\""}</_components.li>{"\n"}<_components.li>{"小姐 (xiǎo jiě) - \"miss\""}</_components.li>{"\n"}<_components.li>{"小心 (xiǎo xīn) - \"be careful\""}</_components.li>{"\n"}<_components.li>{"小时 (xiǎo shí) - \"hour\""}</_components.li>{"\n"}</_components.ul></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
