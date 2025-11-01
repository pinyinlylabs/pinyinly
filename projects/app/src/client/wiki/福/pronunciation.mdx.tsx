// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 福 (fú)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" fú"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Second tone"}</_components.strong>{" — "}<_components.strong>{"rising"}</_components.strong>{" tone, like asking a question with hope"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"f"}</_components.strong>{" like "}<_components.strong>{"\"f\""}</_components.strong>{" in \"for\""}</_components.li>{"\n"}<_components.li><_components.strong>{"ú"}</_components.strong>{" sounds like "}<_components.strong>{"\"oo\""}</_components.strong>{" in \"food\", but with second tone → rise up"}</_components.li>{"\n"}<_components.li><_components.strong>{"fú"}</_components.strong>{" sounds like "}<_components.strong>{"\"foo\""}</_components.strong>{" with a rising tone, like asking \"food?\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"second tone"}</_components.strong>{" (´) is a "}<_components.strong>{"rising"}</_components.strong>{" tone:"}</_components.p>{"\n"}<_components.p>{"Say it like you're asking with hope: "}<_components.strong>{"\"fú?\""}</_components.strong>{" — that's the hopeful rising tone of "}<_components.strong>{"fú"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"福 (fú) - \"blessing; fortune\""}</_components.li>{"\n"}<_components.li>{"幸福 (xìng fú) - \"happiness\""}</_components.li>{"\n"}<_components.li>{"福利 (fú lì) - \"welfare; benefits\""}</_components.li>{"\n"}<_components.li>{"祝福 (zhù fú) - \"to bless; blessing\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Cultural Note:"}</_components.strong></_components.p>{"\n"}<_components.p>{"福 is one of the most auspicious characters in Chinese culture, often displayed upside down during\nChinese New Year to symbolize that fortune has \"arrived\" (倒福)."}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
