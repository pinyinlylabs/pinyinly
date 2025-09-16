// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 马 (mǎ)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" mǎ"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Third tone"}</_components.strong>{" — "}<_components.strong>{"falling-rising"}</_components.strong>{" tone, like saying \"uh-huh\" when nodding"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"m"}</_components.strong>{" like "}<_components.strong>{"\"m\""}</_components.strong>{" in \"mother\""}</_components.li>{"\n"}<_components.li><_components.strong>{"ǎ"}</_components.strong>{" sounds like "}<_components.strong>{"\"ah\""}</_components.strong>{" but with third tone → dip down and rise up"}</_components.li>{"\n"}<_components.li><_components.strong>{"mǎ"}</_components.strong>{" sounds like "}<_components.strong>{"\"mah\""}</_components.strong>{" with a dip-then-rise"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"third tone"}</_components.strong>{" (ˇ) is a "}<_components.strong>{"fall–then-rise"}</_components.strong>{" tone: Say it like you're thinking or being\nthoughtful: "}<_components.strong>{"\"mǎ...\""}</_components.strong>{" — that's the tone pattern of "}<_components.strong>{"mǎ"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"马 (mǎ) - \"horse\""}</_components.li>{"\n"}<_components.li>{"马上 (mǎ shàng) - \"immediately\""}</_components.li>{"\n"}<_components.li>{"马路 (mǎ lù) - \"road; street\""}</_components.li>{"\n"}<_components.li>{"骑马 (qí mǎ) - \"ride a horse\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"Think of a horse's "}<_components.strong>{"up and down"}</_components.strong>{" galloping motion — that matches the falling-rising tone of 马!"}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
