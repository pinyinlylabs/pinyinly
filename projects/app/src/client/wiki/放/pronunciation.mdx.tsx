// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 放 (fàng)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" fàng"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Fourth tone"}</_components.strong>{" — sharp "}<_components.strong>{"falling"}</_components.strong>{" tone, like giving a command"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"f"}</_components.strong>{" like "}<_components.strong>{"\"f\""}</_components.strong>{" in \"fun\""}</_components.li>{"\n"}<_components.li><_components.strong>{"àng"}</_components.strong>{" sounds like "}<_components.strong>{"\"ahng\""}</_components.strong>{", but with a sharp falling tone"}</_components.li>{"\n"}<_components.li><_components.strong>{"fàng"}</_components.strong>{" sounds like "}<_components.strong>{"\"fahng!\""}</_components.strong>{" with a sharp drop"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"放 (fàng) - \"put, place\""}</_components.li>{"\n"}<_components.li>{"放下 (fàng xià) - \"put down\""}</_components.li>{"\n"}<_components.li>{"放学 (fàng xué) - \"school is out\""}</_components.li>{"\n"}<_components.li>{"放心 (fàng xīn) - \"be at ease\""}</_components.li>{"\n"}<_components.li>{"放假 (fàng jià) - \"have a holiday\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The sharp falling fourth tone matches the decisive action of "}<_components.strong>{"putting"}</_components.strong>{" or "}<_components.strong>{"placing"}</_components.strong>{" something\ndown firmly."}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
