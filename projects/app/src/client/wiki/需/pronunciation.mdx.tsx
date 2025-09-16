// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 需 (xū)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" xū"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: First tone"}</_components.strong>{" — "}<_components.strong>{"high and flat"}</_components.strong>{" tone, like a steady note"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"x"}</_components.strong>{" like "}<_components.strong>{"\"sh\""}</_components.strong>{" in \"she\" (Chinese x is similar to \"sh\")"}</_components.li>{"\n"}<_components.li><_components.strong>{"ū"}</_components.strong>{" sounds like "}<_components.strong>{"\"oo\""}</_components.strong>{" in \"shoe\", held steady and high"}</_components.li>{"\n"}<_components.li><_components.strong>{"xū"}</_components.strong>{" sounds like "}<_components.strong>{"\"shoo\""}</_components.strong>{" with a steady high pitch"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"需 (xū) - \"need\""}</_components.li>{"\n"}<_components.li>{"需要 (xū yào) - \"to need; require\""}</_components.li>{"\n"}<_components.li>{"需求 (xū qiú) - \"demand; requirement\""}</_components.li>{"\n"}<_components.li>{"必需 (bì xū) - \"necessary; essential\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"high flat tone"}</_components.strong>{" sounds urgent and steady, like when you really "}<_components.strong>{"need"}</_components.strong>{" something — "}<_components.strong>{"xū"}</_components.strong></_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
