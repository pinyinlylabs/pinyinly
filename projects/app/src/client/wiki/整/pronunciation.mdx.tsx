// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 整 (zhěng)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" zhěng"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Third tone"}</_components.strong>{" — "}<_components.strong>{"falling-rising"}</_components.strong>{" tone, like saying \"uh-huh\" when nodding"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"zh"}</_components.strong>{" like "}<_components.strong>{"\"j\""}</_components.strong>{" in \"judge\", but with tongue curled back"}</_components.li>{"\n"}<_components.li><_components.strong>{"ěng"}</_components.strong>{" sounds like "}<_components.strong>{"\"ung\""}</_components.strong>{" in \"hung\", but with the "}<_components.strong>{"third tone"}</_components.strong>{" → dip down and rise up"}</_components.li>{"\n"}<_components.li><_components.strong>{"zhěng"}</_components.strong>{" sounds like "}<_components.strong>{"\"jung\""}</_components.strong>{" with a dip-then-rise"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"整 (zhěng) - \"whole, entire\""}</_components.li>{"\n"}<_components.li>{"整天 (zhěng tiān) - \"all day\""}</_components.li>{"\n"}<_components.li>{"整个 (zhěng gè) - \"the whole\""}</_components.li>{"\n"}<_components.li>{"整理 (zhěng lǐ) - \"organize, tidy up\""}</_components.li>{"\n"}<_components.li>{"完整 (wán zhěng) - \"complete, intact\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The third tone's complete dip-and-rise cycle mirrors the concept of "}<_components.strong>{"整"}</_components.strong>{" - something that goes\nthrough a complete process to become "}<_components.strong>{"whole"}</_components.strong>{"."}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
