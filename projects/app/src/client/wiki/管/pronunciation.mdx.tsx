// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 管 (guǎn)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" guǎn"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Third tone"}</_components.strong>{" — "}<_components.strong>{"falling-rising"}</_components.strong>{" tone, like saying \"uh-huh\" when nodding"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"g"}</_components.strong>{" like "}<_components.strong>{"\"g\""}</_components.strong>{" in \"go\""}</_components.li>{"\n"}<_components.li><_components.strong>{"uǎn"}</_components.strong>{" sounds like "}<_components.strong>{"\"wan\""}</_components.strong>{" but with third tone → dip down and rise up"}</_components.li>{"\n"}<_components.li><_components.strong>{"guǎn"}</_components.strong>{" sounds like "}<_components.strong>{"\"gwan\""}</_components.strong>{" with a dip-then-rise"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"third tone"}</_components.strong>{" (ˇ) is a "}<_components.strong>{"fall–then-rise"}</_components.strong>{" tone:"}</_components.p>{"\n"}<_components.p>{"Say it like you're considering whether to manage something: "}<_components.strong>{"\"guǎn...\""}</_components.strong>{" — that thoughtful tone\npattern."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"管 (guǎn) - \"manage; control; tube\""}</_components.li>{"\n"}<_components.li>{"管理 (guǎn lǐ) - \"manage; administer\""}</_components.li>{"\n"}<_components.li>{"不管 (bù guǎn) - \"regardless; no matter\""}</_components.li>{"\n"}<_components.li>{"管子 (guǎn zi) - \"tube; pipe\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"Think of "}<_components.strong>{"管"}</_components.strong>{" as a manager thinking things through — the third tone dips down (considering) then\nrises up (deciding to manage)!"}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
