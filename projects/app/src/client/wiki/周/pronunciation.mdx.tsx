// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 周 (zhōu)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" zhōu"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: First tone"}</_components.strong>{" — "}<_components.strong>{"high and flat"}</_components.strong>{" tone, like a steady note: "}<_components.strong>{"\"Eeee\""}</_components.strong></_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"zh"}</_components.strong>{" like "}<_components.strong>{"\"j\""}</_components.strong>{" in \"judge\", but with tongue tip curled back"}</_components.li>{"\n"}<_components.li><_components.strong>{"ōu"}</_components.strong>{" sounds like "}<_components.strong>{"\"oh\""}</_components.strong>{" but held steady and high"}</_components.li>{"\n"}<_components.li><_components.strong>{"zhōu"}</_components.strong>{" sounds like "}<_components.strong>{"\"joe\""}</_components.strong>{" with a steady high pitch"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"first tone"}</_components.strong>{" (ˉ) is a "}<_components.strong>{"high and flat"}</_components.strong>{" tone:"}</_components.p>{"\n"}<_components.p>{"Say it like you're holding a steady musical note: "}<_components.strong>{"\"zhōu...\""}</_components.strong>{" — keep the pitch high and level."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"周 (zhōu) - \"week; circumference\""}</_components.li>{"\n"}<_components.li>{"周末 (zhōu mò) - \"weekend\""}</_components.li>{"\n"}<_components.li>{"周围 (zhōu wéi) - \"around; surrounding\""}</_components.li>{"\n"}<_components.li>{"周年 (zhōu nián) - \"anniversary\""}</_components.li>{"\n"}<_components.li>{"一周 (yí zhōu) - \"one week\""}</_components.li>{"\n"}<_components.li>{"上周 (shàng zhōu) - \"last week\""}</_components.li>{"\n"}<_components.li>{"下周 (xià zhōu) - \"next week\""}</_components.li>{"\n"}</_components.ul></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
