// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 封 (fēng)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" fēng"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: First tone"}</_components.strong>{" — "}<_components.strong>{"high and flat"}</_components.strong>{" tone, like a steady note"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"f"}</_components.strong>{" like "}<_components.strong>{"\"f\""}</_components.strong>{" in \"fun\""}</_components.li>{"\n"}<_components.li><_components.strong>{"ēng"}</_components.strong>{" sounds like "}<_components.strong>{"\"ung\""}</_components.strong>{" in \"sung\" but with a steady high tone"}</_components.li>{"\n"}<_components.li><_components.strong>{"fēng"}</_components.strong>{" sounds like "}<_components.strong>{"\"fung\""}</_components.strong>{" with a steady high pitch"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"first tone"}</_components.strong>{" (ˉ) is a "}<_components.strong>{"high and flat"}</_components.strong>{" tone:"}</_components.p>{"\n"}<_components.p>{"Say it like a steady note: "}<_components.strong>{"\"fēng—\""}</_components.strong>{" — that's the tone pattern of "}<_components.strong>{"fēng"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"封 (fēng) - \"seal\""}</_components.li>{"\n"}<_components.li>{"封信 (fēng xìn) - \"seal a letter\""}</_components.li>{"\n"}<_components.li>{"封闭 (fēng bì) - \"close off\""}</_components.li>{"\n"}<_components.li>{"密封 (mì fēng) - \"seal tightly\""}</_components.li>{"\n"}<_components.li>{"解封 (jiě fēng) - \"unseal\""}</_components.li>{"\n"}</_components.ul></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
