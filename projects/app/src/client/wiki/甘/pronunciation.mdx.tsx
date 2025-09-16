// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 甘 (gān)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" gān"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: First tone"}</_components.strong>{" — "}<_components.strong>{"high and flat"}</_components.strong>{" tone, like a steady note: "}<_components.strong>{"\"Ahhh\""}</_components.strong></_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"g"}</_components.strong>{" like "}<_components.strong>{"\"g\""}</_components.strong>{" in \"go\""}</_components.li>{"\n"}<_components.li><_components.strong>{"ān"}</_components.strong>{" sounds like "}<_components.strong>{"\"an\""}</_components.strong>{" in \"can\", but with first tone → steady and high"}</_components.li>{"\n"}<_components.li><_components.strong>{"gān"}</_components.strong>{" sounds like "}<_components.strong>{"\"gahn\""}</_components.strong>{" with a steady high pitch"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"甘 (gān) - \"sweet\""}</_components.li>{"\n"}<_components.li>{"甘蔗 (gān zhè) - \"sugar cane\""}</_components.li>{"\n"}<_components.li>{"甘甜 (gān tián) - \"sweet and pleasant\""}</_components.li>{"\n"}<_components.li>{"甘心 (gān xīn) - \"willing; resigned\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"First tone is like singing a steady high note - keep your voice "}<_components.strong>{"flat and high"}</_components.strong>{" throughout\n"}<_components.strong>{"gān"}</_components.strong>{"."}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
