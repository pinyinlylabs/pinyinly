// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 西 (xī)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" xī"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: First tone"}</_components.strong>{" — "}<_components.strong>{"high and flat"}</_components.strong>{" tone, like holding a steady note: "}<_components.strong>{"\"Eeee\""}</_components.strong></_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"x"}</_components.strong>{" like "}<_components.strong>{"\"sh\""}</_components.strong>{" in \"she\" but with tongue positioned lower"}</_components.li>{"\n"}<_components.li><_components.strong>{"ī"}</_components.strong>{" sounds like "}<_components.strong>{"\"ee\""}</_components.strong>{" in \"see\" but held steady and high"}</_components.li>{"\n"}<_components.li><_components.strong>{"xī"}</_components.strong>{" sounds like "}<_components.strong>{"\"shee\""}</_components.strong>{" with a steady high pitch"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"西 (xī) - \"west\""}</_components.li>{"\n"}<_components.li>{"东西 (dōng xi) - \"thing; stuff\""}</_components.li>{"\n"}<_components.li>{"西方 (xī fāng) - \"the West; western\""}</_components.li>{"\n"}<_components.li>{"西部 (xī bù) - \"western part\""}</_components.li>{"\n"}<_components.li>{"西边 (xī biān) - \"west side\""}</_components.li>{"\n"}<_components.li>{"西餐 (xī cān) - \"Western food\""}</_components.li>{"\n"}<_components.li>{"西医 (xī yī) - \"Western medicine\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The steady, high first tone is like pointing confidently toward the west and saying \"There!\" - clear\nand unwavering direction."}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
